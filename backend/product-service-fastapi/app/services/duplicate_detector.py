"""
AI-powered Duplicate Detection Service
Uses multiple algorithms to detect potential duplicate SKUs
"""
import re
import json
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from difflib import SequenceMatcher
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_

from app.models.sku_simple import ProductSKU
from app.models.product import Product


@dataclass
class DuplicateCandidate:
    """Represents a potential duplicate SKU"""
    existing_sku_id: str
    existing_sku_code: str
    existing_product_name: str
    existing_variant: Dict
    similarity_score: float
    match_type: str
    match_reason: str
    confidence_level: str


@dataclass
class DuplicateDetectionResult:
    """Result of duplicate detection analysis"""
    is_duplicate_detected: bool
    confidence_score: float
    candidates: List[DuplicateCandidate]
    total_candidates: int
    detection_methods_used: List[str]
    processing_time_ms: float


class AIDuplicateDetector:
    """AI-powered duplicate detection service"""
    
    # Confidence thresholds
    HIGH_CONFIDENCE_THRESHOLD = 0.90
    MEDIUM_CONFIDENCE_THRESHOLD = 0.75
    LOW_CONFIDENCE_THRESHOLD = 0.60
    
    # Similarity thresholds for different match types
    EXACT_MATCH_THRESHOLD = 1.0
    FUZZY_MATCH_THRESHOLD = 0.85
    SEMANTIC_MATCH_THRESHOLD = 0.80
    VARIANT_MATCH_THRESHOLD = 0.90
    
    def __init__(self):
        # Common words to ignore in comparisons
        self.stop_words = {
            '的', '了', '和', '與', '或', '及', '等', '各種', '多種',
            'the', 'and', 'or', 'with', 'for', 'of', 'in', 'to', 'a', 'an'
        }
        
        # Variant mapping for normalization
        self.variant_mappings = {
            '大': ['large', 'l', 'big', '大號', '大包'],
            '中': ['medium', 'm', 'mid', '中號', '中包'],
            '小': ['small', 's', 'mini', '小號', '小包'],
            '有機': ['organic', 'bio', '無農藥'],
            '冷凍': ['frozen', 'freeze', '急凍'],
            '新鮮': ['fresh', 'live', '活'],
            'A級': ['grade a', 'premium', '特級', '頂級'],
            'B級': ['grade b', 'standard', '標準', '普通']
        }
    
    def normalize_text(self, text: str) -> str:
        """Normalize text for comparison"""
        if not text:
            return ""
        
        # Convert to lowercase
        text = text.lower().strip()
        
        # Remove punctuation and special characters
        text = re.sub(r'[^\w\s\u4e00-\u9fff]', ' ', text)
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        
        # Remove stop words
        words = text.split()
        words = [w for w in words if w not in self.stop_words]
        
        return ' '.join(words)
    
    def extract_keywords(self, text: str) -> List[str]:
        """Extract meaningful keywords from text"""
        normalized = self.normalize_text(text)
        words = normalized.split()
        
        # Filter out very short words (< 2 characters)
        keywords = [w for w in words if len(w) >= 2]
        
        return keywords
    
    def calculate_levenshtein_similarity(self, str1: str, str2: str) -> float:
        """Calculate Levenshtein distance similarity"""
        if not str1 or not str2:
            return 0.0
        
        # Use SequenceMatcher for similarity
        return SequenceMatcher(None, str1, str2).ratio()
    
    def calculate_jaccard_similarity(self, set1: set, set2: set) -> float:
        """Calculate Jaccard similarity between two sets"""
        if not set1 and not set2:
            return 1.0
        if not set1 or not set2:
            return 0.0
        
        intersection = len(set1.intersection(set2))
        union = len(set1.union(set2))
        
        return intersection / union if union > 0 else 0.0
    
    def normalize_variant(self, variant: Dict) -> Dict:
        """Normalize variant data for comparison"""
        if not variant:
            return {}
        
        normalized = {}
        
        for key, value in variant.items():
            if value is None:
                continue
                
            value_str = str(value).lower().strip()
            
            # Normalize using mappings
            normalized_value = value_str
            for standard, alternatives in self.variant_mappings.items():
                if value_str in alternatives or value_str == standard.lower():
                    normalized_value = standard.lower()
                    break
            
            normalized[key.lower()] = normalized_value
        
        return normalized
    
    def calculate_variant_similarity(self, variant1: Dict, variant2: Dict) -> float:
        """Calculate similarity between variant objects"""
        norm1 = self.normalize_variant(variant1 or {})
        norm2 = self.normalize_variant(variant2 or {})
        
        if not norm1 and not norm2:
            return 1.0
        if not norm1 or not norm2:
            return 0.0
        
        # Get all unique keys
        all_keys = set(norm1.keys()) | set(norm2.keys())
        
        matches = 0
        total = len(all_keys)
        
        for key in all_keys:
            val1 = norm1.get(key, "")
            val2 = norm2.get(key, "")
            
            if val1 == val2:
                matches += 1
            elif val1 and val2:
                # Calculate string similarity for partial matches
                similarity = self.calculate_levenshtein_similarity(val1, val2)
                if similarity >= 0.8:  # High similarity threshold for variants
                    matches += similarity
        
        return matches / total if total > 0 else 0.0
    
    def detect_exact_matches(
        self, 
        new_item: Dict, 
        existing_skus: List[Dict]
    ) -> List[DuplicateCandidate]:
        """Detect exact matches in product name and variant"""
        candidates = []
        
        new_name = self.normalize_text(new_item.get('product_name', ''))
        new_variant = new_item.get('variant', {})
        
        for sku in existing_skus:
            existing_name = self.normalize_text(sku.get('product_name', ''))
            existing_variant = sku.get('variant', {})
            
            # Check exact name match
            if new_name == existing_name:
                variant_similarity = self.calculate_variant_similarity(new_variant, existing_variant)
                
                if variant_similarity >= self.VARIANT_MATCH_THRESHOLD:
                    candidates.append(DuplicateCandidate(
                        existing_sku_id=sku['id'],
                        existing_sku_code=sku['sku_code'],
                        existing_product_name=sku['product_name'],
                        existing_variant=existing_variant,
                        similarity_score=1.0,
                        match_type="exact_match",
                        match_reason=f"Exact product name match with {variant_similarity:.1%} variant similarity",
                        confidence_level="high"
                    ))
        
        return candidates
    
    def detect_fuzzy_matches(
        self, 
        new_item: Dict, 
        existing_skus: List[Dict]
    ) -> List[DuplicateCandidate]:
        """Detect fuzzy matches using string similarity"""
        candidates = []
        
        new_name = self.normalize_text(new_item.get('product_name', ''))
        new_keywords = set(self.extract_keywords(new_item.get('product_name', '')))
        new_variant = new_item.get('variant', {})
        
        for sku in existing_skus:
            existing_name = self.normalize_text(sku.get('product_name', ''))
            existing_keywords = set(self.extract_keywords(sku.get('product_name', '')))
            existing_variant = sku.get('variant', {})
            
            # Calculate name similarity
            name_similarity = self.calculate_levenshtein_similarity(new_name, existing_name)
            keyword_similarity = self.calculate_jaccard_similarity(new_keywords, existing_keywords)
            variant_similarity = self.calculate_variant_similarity(new_variant, existing_variant)
            
            # Combined similarity score
            combined_score = (name_similarity * 0.5) + (keyword_similarity * 0.3) + (variant_similarity * 0.2)
            
            if combined_score >= self.FUZZY_MATCH_THRESHOLD:
                confidence = "high" if combined_score >= self.HIGH_CONFIDENCE_THRESHOLD else "medium"
                
                candidates.append(DuplicateCandidate(
                    existing_sku_id=sku['id'],
                    existing_sku_code=sku['sku_code'],
                    existing_product_name=sku['product_name'],
                    existing_variant=existing_variant,
                    similarity_score=combined_score,
                    match_type="fuzzy_match",
                    match_reason=f"High similarity: name={name_similarity:.1%}, keywords={keyword_similarity:.1%}, variant={variant_similarity:.1%}",
                    confidence_level=confidence
                ))
        
        return candidates
    
    def detect_semantic_matches(
        self, 
        new_item: Dict, 
        existing_skus: List[Dict]
    ) -> List[DuplicateCandidate]:
        """Detect semantic matches using keyword analysis"""
        candidates = []
        
        new_keywords = set(self.extract_keywords(new_item.get('product_name', '')))
        new_variant = new_item.get('variant', {})
        
        # Skip if too few keywords
        if len(new_keywords) < 2:
            return candidates
        
        for sku in existing_skus:
            existing_keywords = set(self.extract_keywords(sku.get('product_name', '')))
            existing_variant = sku.get('variant', {})
            
            # Calculate keyword overlap
            keyword_similarity = self.calculate_jaccard_similarity(new_keywords, existing_keywords)
            variant_similarity = self.calculate_variant_similarity(new_variant, existing_variant)
            
            # Check for high keyword overlap
            if keyword_similarity >= self.SEMANTIC_MATCH_THRESHOLD:
                combined_score = (keyword_similarity * 0.7) + (variant_similarity * 0.3)
                
                if combined_score >= self.SEMANTIC_MATCH_THRESHOLD:
                    confidence = "medium" if combined_score >= self.MEDIUM_CONFIDENCE_THRESHOLD else "low"
                    
                    candidates.append(DuplicateCandidate(
                        existing_sku_id=sku['id'],
                        existing_sku_code=sku['sku_code'],
                        existing_product_name=sku['product_name'],
                        existing_variant=existing_variant,
                        similarity_score=combined_score,
                        match_type="semantic_match",
                        match_reason=f"High keyword overlap: {keyword_similarity:.1%} with variant similarity {variant_similarity:.1%}",
                        confidence_level=confidence
                    ))
        
        return candidates
    
    async def get_existing_skus(
        self, 
        db: AsyncSession, 
        category_filter: Optional[str] = None
    ) -> List[Dict]:
        """Get existing SKUs from database for comparison"""
        query = select(
            ProductSKU.id,
            ProductSKU.sku_code,
            ProductSKU.name.label('product_name'),
            ProductSKU.variant,
            Product.name.label('base_product_name'),
            Product.category_id
        ).join(Product, ProductSKU.product_id == Product.id).where(
            ProductSKU.is_active == True
        )
        
        # Add category filter if provided
        if category_filter:
            query = query.where(Product.category_id == category_filter)
        
        result = await db.execute(query)
        rows = result.fetchall()
        
        # Convert to list of dictionaries
        return [
            {
                'id': row.id,
                'sku_code': row.sku_code,
                'product_name': row.product_name,
                'variant': row.variant or {},
                'base_product_name': row.base_product_name,
                'category_id': row.category_id
            }
            for row in rows
        ]
    
    async def detect_duplicates(
        self,
        db: AsyncSession,
        new_item: Dict,
        category_filter: Optional[str] = None
    ) -> DuplicateDetectionResult:
        """Main duplicate detection method"""
        import time
        start_time = time.time()
        
        # Get existing SKUs for comparison
        existing_skus = await self.get_existing_skus(db, category_filter)
        
        all_candidates = []
        methods_used = []
        
        # 1. Exact match detection
        exact_matches = self.detect_exact_matches(new_item, existing_skus)
        if exact_matches:
            all_candidates.extend(exact_matches)
            methods_used.append("exact_match")
        
        # 2. Fuzzy match detection (only if no exact matches)
        if not exact_matches:
            fuzzy_matches = self.detect_fuzzy_matches(new_item, existing_skus)
            if fuzzy_matches:
                all_candidates.extend(fuzzy_matches)
                methods_used.append("fuzzy_match")
        
        # 3. Semantic match detection (only if no high-confidence matches)
        high_confidence_matches = [c for c in all_candidates if c.confidence_level == "high"]
        if not high_confidence_matches:
            semantic_matches = self.detect_semantic_matches(new_item, existing_skus)
            if semantic_matches:
                all_candidates.extend(semantic_matches)
                methods_used.append("semantic_match")
        
        # Remove duplicates and sort by similarity score
        unique_candidates = {}
        for candidate in all_candidates:
            key = candidate.existing_sku_id
            if key not in unique_candidates or candidate.similarity_score > unique_candidates[key].similarity_score:
                unique_candidates[key] = candidate
        
        final_candidates = sorted(
            unique_candidates.values(), 
            key=lambda x: x.similarity_score, 
            reverse=True
        )
        
        # Limit to top 5 candidates
        final_candidates = final_candidates[:5]
        
        # Calculate overall confidence
        max_score = max([c.similarity_score for c in final_candidates]) if final_candidates else 0.0
        is_duplicate = max_score >= self.LOW_CONFIDENCE_THRESHOLD
        
        processing_time = (time.time() - start_time) * 1000  # Convert to milliseconds
        
        return DuplicateDetectionResult(
            is_duplicate_detected=is_duplicate,
            confidence_score=max_score,
            candidates=final_candidates,
            total_candidates=len(final_candidates),
            detection_methods_used=methods_used,
            processing_time_ms=processing_time
        )
    
    async def batch_detect_duplicates(
        self,
        db: AsyncSession,
        items: List[Dict],
        category_filter: Optional[str] = None
    ) -> List[DuplicateDetectionResult]:
        """Batch duplicate detection for multiple items"""
        results = []
        
        # Get existing SKUs once for all comparisons
        existing_skus = await self.get_existing_skus(db, category_filter)
        
        # Also check for duplicates within the batch itself
        for i, item in enumerate(items):
            # Check against existing SKUs
            result = await self.detect_duplicates(db, item, category_filter)
            
            # Check against previous items in the same batch
            batch_candidates = []
            for j in range(i):
                prev_item = items[j]
                similarity = self.calculate_name_and_variant_similarity(item, prev_item)
                
                if similarity >= self.FUZZY_MATCH_THRESHOLD:
                    batch_candidates.append(DuplicateCandidate(
                        existing_sku_id=f"batch_{j}",
                        existing_sku_code=f"BATCH-ROW-{j+1}",
                        existing_product_name=prev_item.get('product_name', ''),
                        existing_variant=prev_item.get('variant', {}),
                        similarity_score=similarity,
                        match_type="batch_duplicate",
                        match_reason=f"Duplicate within same batch (row {j+1})",
                        confidence_level="high" if similarity >= self.HIGH_CONFIDENCE_THRESHOLD else "medium"
                    ))
            
            # Add batch candidates to result
            if batch_candidates:
                result.candidates.extend(batch_candidates)
                result.is_duplicate_detected = True
                result.confidence_score = max(
                    result.confidence_score,
                    max([c.similarity_score for c in batch_candidates])
                )
                if "batch_duplicate" not in result.detection_methods_used:
                    result.detection_methods_used.append("batch_duplicate")
            
            results.append(result)
        
        return results
    
    def calculate_name_and_variant_similarity(self, item1: Dict, item2: Dict) -> float:
        """Calculate overall similarity between two items"""
        name1 = self.normalize_text(item1.get('product_name', ''))
        name2 = self.normalize_text(item2.get('product_name', ''))
        
        name_similarity = self.calculate_levenshtein_similarity(name1, name2)
        variant_similarity = self.calculate_variant_similarity(
            item1.get('variant', {}),
            item2.get('variant', {})
        )
        
        return (name_similarity * 0.7) + (variant_similarity * 0.3)
    
    def format_detection_summary(self, result: DuplicateDetectionResult) -> Dict:
        """Format detection result for API response"""
        return {
            'is_duplicate_detected': result.is_duplicate_detected,
            'confidence_score': round(result.confidence_score, 3),
            'confidence_level': (
                'high' if result.confidence_score >= self.HIGH_CONFIDENCE_THRESHOLD else
                'medium' if result.confidence_score >= self.MEDIUM_CONFIDENCE_THRESHOLD else
                'low'
            ),
            'total_candidates': result.total_candidates,
            'processing_time_ms': round(result.processing_time_ms, 2),
            'detection_methods': result.detection_methods_used,
            'candidates': [
                {
                    'existing_sku_id': c.existing_sku_id,
                    'existing_sku_code': c.existing_sku_code,
                    'existing_product_name': c.existing_product_name,
                    'existing_variant': c.existing_variant,
                    'similarity_score': round(c.similarity_score, 3),
                    'match_type': c.match_type,
                    'match_reason': c.match_reason,
                    'confidence_level': c.confidence_level
                }
                for c in result.candidates
            ]
        }