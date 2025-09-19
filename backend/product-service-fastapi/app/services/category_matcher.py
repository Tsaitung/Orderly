"""
AI-powered Category Validation Service
Validates product categories and suggests corrections using keyword analysis
"""
import re
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.category import ProductCategory


@dataclass
class CategorySuggestion:
    """Represents a category suggestion"""
    category_id: str
    category_name: str
    category_path: str
    confidence_score: float
    match_reason: str
    keywords_matched: List[str]


@dataclass
class CategoryValidationResult:
    """Result of category validation"""
    is_correct: bool
    confidence_score: float
    user_category: str
    matched_category_id: Optional[str]
    suggestions: List[CategorySuggestion]
    total_suggestions: int
    validation_method: str
    processing_time_ms: float


class AICategoryValidator:
    """AI-powered category validation service"""
    
    # Confidence thresholds
    HIGH_CONFIDENCE_THRESHOLD = 0.85
    MEDIUM_CONFIDENCE_THRESHOLD = 0.70
    LOW_CONFIDENCE_THRESHOLD = 0.55
    
    def __init__(self):
        # Keyword mappings for different categories
        self.category_keywords = {
            # 蔬菜類
            "蔬菜": {
                "keywords": ["蔬菜", "青菜", "菜", "葉菜", "根莖", "瓜果", "豆類", "菇", "芽菜"],
                "products": ["白菜", "高麗菜", "菠菜", "小白菜", "青江菜", "萵苣", "胡蘿蔔", "白蘿蔔", "洋蔥", "馬鈴薯", "番茄", "黃瓜", "茄子", "青椒", "玉米", "花椰菜", "青花菜", "蘆筍", "韭菜", "蔥", "蒜", "薑", "芹菜", "香菜", "九層塔"]
            },
            # 水果類
            "水果": {
                "keywords": ["水果", "果", "果實", "鮮果", "進口果"],
                "products": ["蘋果", "香蕉", "橘子", "柳丁", "葡萄", "草莓", "芒果", "鳳梨", "木瓜", "奇異果", "桃子", "李子", "櫻桃", "藍莓", "火龍果", "百香果", "蓮霧", "芭樂", "柿子", "梨子", "西瓜", "哈密瓜", "椰子", "檸檬", "柚子"]
            },
            # 肉類
            "肉類": {
                "keywords": ["肉", "豬", "牛", "雞", "鴨", "羊", "火腿", "香腸", "培根", "絞肉", "排骨", "雞腿", "雞胸", "牛排", "豬排"],
                "products": ["豬肉", "牛肉", "雞肉", "鴨肉", "羊肉", "豬絞肉", "牛絞肉", "雞絞肉", "豬排骨", "牛排骨", "雞腿", "雞胸肉", "雞翅", "牛腱", "牛腩", "豬五花", "豬後腿", "火腿", "香腸", "培根"]
            },
            # 海鮮類
            "海鮮": {
                "keywords": ["海鮮", "魚", "蝦", "蟹", "貝", "花枝", "魷魚", "鮭魚", "鯖魚", "鱈魚", "石斑", "虱目魚", "吳郭魚", "鮪魚"],
                "products": ["鮭魚", "鯖魚", "鱈魚", "石斑魚", "虱目魚", "吳郭魚", "鮪魚", "秋刀魚", "白帶魚", "鯛魚", "蝦子", "草蝦", "白蝦", "螃蟹", "花蟹", "蛤蜊", "牡蠣", "干貝", "花枝", "魷魚", "透抽", "小卷"]
            },
            # 乳製品
            "乳製品": {
                "keywords": ["奶", "乳", "起司", "乳酪", "優格", "奶油", "鮮奶", "保久乳"],
                "products": ["鮮奶", "保久乳", "優格", "起司", "乳酪", "奶油", "鮮奶油", "煉乳", "奶粉", "乳清蛋白"]
            },
            # 飲料
            "飲料": {
                "keywords": ["飲料", "飲", "汁", "茶", "咖啡", "可樂", "汽水", "果汁", "豆漿", "椰奶"],
                "products": ["果汁", "蘋果汁", "柳橙汁", "茶", "綠茶", "烏龍茶", "紅茶", "咖啡", "可樂", "汽水", "豆漿", "椰奶", "運動飲料", "能量飲料"]
            },
            # 調料調味
            "調料": {
                "keywords": ["調料", "調味", "醬", "油", "醋", "鹽", "糖", "胡椒", "辣椒", "香料", "蒜泥", "薑泥"],
                "products": ["醬油", "蠔油", "魚露", "味噌", "番茄醬", "辣椒醬", "沙茶醬", "花生醬", "芝麻醬", "沙拉醬", "美乃滋", "橄欖油", "沙拉油", "麻油", "白醋", "米醋", "鹽", "糖", "黑胡椒", "白胡椒", "蒜粉", "薑粉"]
            },
            # 穀物米麵
            "穀物": {
                "keywords": ["米", "麵", "麵條", "義大利麵", "泡麵", "粥", "燕麥", "薏仁", "紅豆", "綠豆", "花生", "芝麻"],
                "products": ["白米", "糙米", "胚芽米", "壽司米", "義大利麵", "烏龍麵", "拉麵", "米粉", "冬粉", "河粉", "燕麥", "薏仁", "紅豆", "綠豆", "花生", "芝麻", "核桃", "杏仁", "腰果"]
            },
            # 零食點心
            "零食": {
                "keywords": ["零食", "餅乾", "糖果", "巧克力", "洋芋片", "爆米花", "堅果", "蜜餞", "果乾"],
                "products": ["餅乾", "蘇打餅乾", "夾心餅乾", "糖果", "巧克力", "軟糖", "硬糖", "洋芋片", "爆米花", "堅果", "花生", "杏仁", "腰果", "開心果", "蜜餞", "果乾", "葡萄乾"]
            },
            # 冷凍食品
            "冷凍": {
                "keywords": ["冷凍", "急凍", "冰淇淋", "雪糕", "湯圓", "水餃", "包子", "饅頭"],
                "products": ["冰淇淋", "雪糕", "冰棒", "湯圓", "水餃", "鍋貼", "包子", "饅頭", "燒餅", "冷凍蔬菜", "冷凍水果", "冷凍海鮮", "冷凍肉品"]
            }
        }
        
        # Common product name patterns
        self.product_patterns = {
            r'.*雞.*': '肉類',
            r'.*豬.*': '肉類', 
            r'.*牛.*': '肉類',
            r'.*魚.*': '海鮮',
            r'.*蝦.*': '海鮮',
            r'.*蟹.*': '海鮮',
            r'.*菜.*': '蔬菜',
            r'.*果.*': '水果',
            r'.*奶.*': '乳製品',
            r'.*茶.*': '飲料',
            r'.*汁.*': '飲料',
            r'.*醬.*': '調料',
            r'.*油.*': '調料',
            r'.*米.*': '穀物',
            r'.*麵.*': '穀物',
            r'.*餅.*': '零食',
            r'.*糖.*': '零食',
            r'.*冰.*': '冷凍'
        }
    
    def extract_keywords_from_product_name(self, product_name: str) -> List[str]:
        """Extract meaningful keywords from product name"""
        if not product_name:
            return []
        
        # Clean and normalize
        cleaned = re.sub(r'[^\w\s\u4e00-\u9fff]', ' ', product_name.lower())
        cleaned = re.sub(r'\s+', ' ', cleaned).strip()
        
        # Extract words
        words = cleaned.split()
        
        # Filter meaningful words (length >= 1 for Chinese characters)
        keywords = [w for w in words if len(w) >= 1]
        
        return keywords
    
    def calculate_keyword_match_score(self, product_keywords: List[str], category_info: Dict) -> Tuple[float, List[str]]:
        """Calculate how well product keywords match a category"""
        if not product_keywords:
            return 0.0, []
        
        matched_keywords = []
        total_matches = 0
        
        # Check against category keywords
        category_keywords = category_info.get('keywords', [])
        for keyword in product_keywords:
            for cat_keyword in category_keywords:
                if keyword in cat_keyword or cat_keyword in keyword:
                    matched_keywords.append(keyword)
                    total_matches += 1
                    break
        
        # Check against known products in this category
        category_products = category_info.get('products', [])
        for keyword in product_keywords:
            for product in category_products:
                if keyword in product or product in keyword:
                    matched_keywords.append(keyword)
                    total_matches += 1
                    break
        
        # Calculate score based on matches
        if total_matches == 0:
            return 0.0, []
        
        # Score considers both number of matches and coverage
        match_ratio = total_matches / len(product_keywords)
        coverage_ratio = len(set(matched_keywords)) / len(product_keywords)
        
        score = (match_ratio * 0.6) + (coverage_ratio * 0.4)
        
        return min(score, 1.0), list(set(matched_keywords))
    
    def calculate_pattern_match_score(self, product_name: str) -> Dict[str, float]:
        """Calculate category scores based on regex patterns"""
        scores = {}
        
        for pattern, category in self.product_patterns.items():
            if re.match(pattern, product_name, re.IGNORECASE):
                scores[category] = 0.8  # High confidence for pattern matches
        
        return scores
    
    async def get_category_tree(self, db: AsyncSession) -> Dict[str, Dict]:
        """Get all categories with their hierarchy"""
        query = select(ProductCategory).where(ProductCategory.is_active == True)
        result = await db.execute(query)
        categories = result.scalars().all()
        
        category_tree = {}
        
        for cat in categories:
            # Build full path
            path_parts = []
            current = cat
            
            # Build path from bottom to top (assuming we have parent_id)
            if hasattr(current, 'parent_id') and current.parent_id:
                # If we have hierarchy, build full path
                path_parts.insert(0, current.name)
                # In a real implementation, we'd traverse up the hierarchy
                full_path = ' > '.join(path_parts)
            else:
                # Simple case - just use the category name
                full_path = current.name
            
            category_tree[current.name] = {
                'id': current.id,
                'name': current.name,
                'path': full_path,
                'description': getattr(current, 'description', ''),
                'level': 1  # In a real hierarchy, calculate actual level
            }
        
        return category_tree
    
    async def validate_category(
        self,
        db: AsyncSession,
        product_name: str,
        user_category: str
    ) -> CategoryValidationResult:
        """Main category validation method"""
        import time
        start_time = time.time()
        
        # Get category tree
        category_tree = await self.get_category_tree(db)
        
        # Extract keywords from product name
        product_keywords = self.extract_keywords_from_product_name(product_name)
        
        # Check if user category exists
        user_category_normalized = user_category.strip()
        is_valid_category = any(
            user_category_normalized.lower() in cat_name.lower() or cat_name.lower() in user_category_normalized.lower()
            for cat_name in category_tree.keys()
        )
        
        suggestions = []
        
        # Generate suggestions using keyword matching
        for cat_name, cat_info in self.category_keywords.items():
            if cat_name in category_tree:
                score, matched_keywords = self.calculate_keyword_match_score(product_keywords, cat_info)
                
                if score >= self.LOW_CONFIDENCE_THRESHOLD:
                    suggestions.append(CategorySuggestion(
                        category_id=category_tree[cat_name]['id'],
                        category_name=cat_name,
                        category_path=category_tree[cat_name]['path'],
                        confidence_score=score,
                        match_reason=f"Keyword match: {', '.join(matched_keywords[:3])}",
                        keywords_matched=matched_keywords
                    ))
        
        # Add pattern-based suggestions
        pattern_scores = self.calculate_pattern_match_score(product_name)
        for cat_name, score in pattern_scores.items():
            if cat_name in category_tree:
                # Check if already suggested
                existing = next((s for s in suggestions if s.category_name == cat_name), None)
                if existing:
                    # Update score if higher
                    if score > existing.confidence_score:
                        existing.confidence_score = score
                        existing.match_reason += " + pattern match"
                else:
                    suggestions.append(CategorySuggestion(
                        category_id=category_tree[cat_name]['id'],
                        category_name=cat_name,
                        category_path=category_tree[cat_name]['path'],
                        confidence_score=score,
                        match_reason="Pattern match",
                        keywords_matched=[]
                    ))
        
        # Sort suggestions by confidence
        suggestions.sort(key=lambda x: x.confidence_score, reverse=True)
        
        # Limit to top 3 suggestions
        suggestions = suggestions[:3]
        
        # Determine if user category is correct
        is_correct = False
        matched_category_id = None
        confidence_score = 0.0
        
        if suggestions:
            best_suggestion = suggestions[0]
            confidence_score = best_suggestion.confidence_score
            
            # Check if user category matches best suggestion
            if (user_category_normalized.lower() == best_suggestion.category_name.lower() or
                user_category_normalized.lower() in best_suggestion.category_name.lower() or
                best_suggestion.category_name.lower() in user_category_normalized.lower()):
                is_correct = True
                matched_category_id = best_suggestion.category_id
            else:
                # Check if user category is reasonable (above medium threshold)
                is_correct = confidence_score < self.MEDIUM_CONFIDENCE_THRESHOLD
        else:
            # No suggestions found - user category might be acceptable
            is_correct = is_valid_category
        
        processing_time = (time.time() - start_time) * 1000
        
        return CategoryValidationResult(
            is_correct=is_correct,
            confidence_score=confidence_score,
            user_category=user_category,
            matched_category_id=matched_category_id,
            suggestions=suggestions,
            total_suggestions=len(suggestions),
            validation_method="keyword_and_pattern_analysis",
            processing_time_ms=processing_time
        )
    
    async def batch_validate_categories(
        self,
        db: AsyncSession,
        items: List[Dict]
    ) -> List[CategoryValidationResult]:
        """Batch category validation for multiple items"""
        results = []
        
        # Get category tree once for all validations
        category_tree = await self.get_category_tree(db)
        
        for item in items:
            product_name = item.get('product_name', '')
            user_category = item.get('category_name', '')
            
            result = await self.validate_category(db, product_name, user_category)
            results.append(result)
        
        return results
    
    def format_validation_summary(self, result: CategoryValidationResult) -> Dict:
        """Format validation result for API response"""
        return {
            'is_correct': result.is_correct,
            'confidence_score': round(result.confidence_score, 3),
            'confidence_level': (
                'high' if result.confidence_score >= self.HIGH_CONFIDENCE_THRESHOLD else
                'medium' if result.confidence_score >= self.MEDIUM_CONFIDENCE_THRESHOLD else
                'low'
            ),
            'user_category': result.user_category,
            'matched_category_id': result.matched_category_id,
            'total_suggestions': result.total_suggestions,
            'processing_time_ms': round(result.processing_time_ms, 2),
            'validation_method': result.validation_method,
            'suggestions': [
                {
                    'category_id': s.category_id,
                    'category_name': s.category_name,
                    'category_path': s.category_path,
                    'confidence_score': round(s.confidence_score, 3),
                    'match_reason': s.match_reason,
                    'keywords_matched': s.keywords_matched
                }
                for s in result.suggestions
            ]
        }
    
    def get_category_statistics(self, results: List[CategoryValidationResult]) -> Dict:
        """Get statistics for a batch of validation results"""
        if not results:
            return {}
        
        total = len(results)
        correct = sum(1 for r in results if r.is_correct)
        has_suggestions = sum(1 for r in results if r.suggestions)
        
        confidence_levels = {
            'high': sum(1 for r in results if r.confidence_score >= self.HIGH_CONFIDENCE_THRESHOLD),
            'medium': sum(1 for r in results if self.MEDIUM_CONFIDENCE_THRESHOLD <= r.confidence_score < self.HIGH_CONFIDENCE_THRESHOLD),
            'low': sum(1 for r in results if r.confidence_score < self.MEDIUM_CONFIDENCE_THRESHOLD)
        }
        
        avg_processing_time = sum(r.processing_time_ms for r in results) / total
        
        return {
            'total_validated': total,
            'correct_categories': correct,
            'incorrect_categories': total - correct,
            'accuracy_rate': correct / total,
            'items_with_suggestions': has_suggestions,
            'confidence_distribution': confidence_levels,
            'average_processing_time_ms': round(avg_processing_time, 2)
        }