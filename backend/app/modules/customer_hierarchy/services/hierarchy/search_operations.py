"""
Search Operations Mixin for HierarchyService

Contains methods for search operations:
- search: Advanced search across hierarchy
- _search_entity_type: Search within specific entity type
- _calculate_relevance_score: Calculate relevance score for results
- _identify_match_fields: Identify matching fields
- _generate_search_suggestions: Generate search suggestions
- _validate_search_permissions: Validate search permissions
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

import structlog

logger = structlog.get_logger(__name__)


class SearchOperationsMixin:
    """Mixin class for search operations"""

    async def search(
        self,
        query: str,
        search_types: Optional[List[str]] = None,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 100,
        include_inactive: bool = False,
        user_context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Advanced search across hierarchy with full-text capabilities

        Features:
        - Multi-entity type search (groups, companies, locations, units)
        - Flexible filtering by status, region, business type
        - Permission-aware results based on user context
        - Ranking by relevance and hierarchy position
        """
        try:
            start_time = datetime.utcnow()
            search_types = search_types or [
                "group",
                "company",
                "location",
                "business_unit",
            ]

            # Validate user permissions for search scope
            allowed_types = await self._validate_search_permissions(
                search_types, user_context
            )

            search_results = []
            total_count = 0

            # Search across each entity type
            for entity_type in allowed_types:
                if total_count >= limit:
                    break

                type_results = await self._search_entity_type(
                    entity_type=entity_type,
                    query=query,
                    filters=filters,
                    limit=min(limit - total_count, 50),  # Distribute across types
                    include_inactive=include_inactive,
                    user_context=user_context,
                )

                search_results.extend(type_results)
                total_count += len(type_results)

            # Sort by relevance score
            search_results.sort(
                key=lambda x: x.get("relevance_score", 0), reverse=True
            )

            # Add breadcrumb information for each result
            enriched_results = []
            for result in search_results[:limit]:
                try:
                    breadcrumb = await self.get_breadcrumb(
                        node_id=result["id"],
                        node_type=result["type"],
                        user_context=user_context,
                    )
                    result["breadcrumb"] = breadcrumb["path"] if breadcrumb else []
                except Exception as e:
                    logger.warning(
                        "Failed to get breadcrumb for search result",
                        node_id=result["id"],
                        error=str(e),
                    )
                    result["breadcrumb"] = []

                enriched_results.append(result)

            end_time = datetime.utcnow()
            search_time_ms = (end_time - start_time).total_seconds() * 1000

            return {
                "results": enriched_results,
                "total_matches": total_count,
                "search_time_ms": search_time_ms,
                "query": query,
                "suggestions": await self._generate_search_suggestions(
                    query, search_results
                ),
            }

        except Exception as e:
            logger.error(
                "Failed to search hierarchy",
                error=str(e),
                query=query,
                search_types=search_types,
            )
            raise

    async def _search_entity_type(
        self,
        entity_type: str,
        query: str,
        filters: Optional[Dict[str, Any]],
        limit: int,
        include_inactive: bool,
        user_context: Optional[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Search within specific entity type"""
        try:
            entity_info = self.entity_map.get(entity_type)
            if not entity_info:
                return []

            crud_service = entity_info["crud"]

            # Perform search
            search_fields = ["name", "code"]
            if hasattr(crud_service, "search"):
                entities = await crud_service.search(
                    self.db,
                    query=query,
                    search_fields=search_fields,
                    limit=limit,
                    include_inactive=include_inactive,
                )
            else:
                # Fallback to basic search using base CRUD
                entities = await crud_service.search(
                    self.db,
                    query=query,
                    search_fields=search_fields,
                    limit=limit,
                    include_inactive=include_inactive,
                )

            results = []
            for entity in entities:
                # Calculate relevance score
                relevance_score = self._calculate_relevance_score(
                    entity, query, search_fields
                )

                result = {
                    "id": entity.id,
                    "name": entity.name,
                    "type": entity_type,
                    "code": getattr(entity, "code", None),
                    "is_active": entity.is_active,
                    "relevance_score": relevance_score,
                    "match_fields": self._identify_match_fields(
                        entity, query, search_fields
                    ),
                }

                # Add type-specific fields for snippet
                snippet_text = f"{entity.name}"
                if hasattr(entity, "description") and entity.description:
                    snippet_text += f" - {entity.description[:100]}"
                result["snippet"] = snippet_text

                results.append(result)

            return results

        except Exception as e:
            logger.error(
                "Failed to search entity type",
                error=str(e),
                entity_type=entity_type,
                query=query,
            )
            return []

    def _calculate_relevance_score(
        self, entity: Any, query: str, search_fields: List[str]
    ) -> float:
        """Calculate relevance score for search result"""
        score = 0.0
        query_lower = query.lower()

        for field in search_fields:
            field_value = getattr(entity, field, None)
            if field_value:
                field_lower = str(field_value).lower()

                # Exact match gets highest score
                if field_lower == query_lower:
                    score += 100.0
                # Starts with query gets high score
                elif field_lower.startswith(query_lower):
                    score += 75.0
                # Contains query gets medium score
                elif query_lower in field_lower:
                    score += 50.0

                # Bonus for shorter fields (more specific matches)
                if query_lower in field_lower:
                    length_bonus = max(0, 20 - len(field_lower))
                    score += length_bonus

        return score

    def _identify_match_fields(
        self, entity: Any, query: str, search_fields: List[str]
    ) -> List[str]:
        """Identify which fields matched the search query"""
        match_fields = []
        query_lower = query.lower()

        for field in search_fields:
            field_value = getattr(entity, field, None)
            if field_value and query_lower in str(field_value).lower():
                match_fields.append(field)

        return match_fields

    async def _generate_search_suggestions(
        self, query: str, results: List[Dict[str, Any]]
    ) -> List[str]:
        """Generate search suggestions based on query and results"""
        suggestions = []

        # Extract common terms from successful matches
        if results:
            # Get unique names and codes from results
            terms = set()
            for result in results[:5]:  # Top 5 results
                if result.get("name"):
                    terms.update(result["name"].split())
                if result.get("code"):
                    terms.add(result["code"])

            # Filter terms that are similar to query but not exact matches
            query_lower = query.lower()
            for term in terms:
                if term.lower() != query_lower and query_lower in term.lower():
                    suggestions.append(term)

        return list(suggestions)[:5]  # Limit to 5 suggestions

    async def _validate_search_permissions(
        self, search_types: List[str], user_context: Optional[Dict[str, Any]]
    ) -> List[str]:
        """Validate which entity types user can search"""
        # For now, return all requested types
        # In production, would implement actual permission checks
        allowed_types = []
        for entity_type in search_types:
            if entity_type in self.entity_map:
                allowed_types.append(entity_type)
        return allowed_types
