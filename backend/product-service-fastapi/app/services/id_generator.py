"""
Auto-ID Generation Service for SKU Codes
Generates unique SKU codes with pattern: CAT-PROD-VAR-YYYYMMDD-XXXX
"""
import re
import uuid
from datetime import datetime
from typing import Optional, Dict, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from sqlalchemy.dialects.postgresql import insert

from app.models.sku_upload import SKUCodeSequence
from app.models.category import ProductCategory


class IDGeneratorService:
    """Service for generating unique IDs and codes for SKUs"""
    
    # Category code mappings for common categories
    CATEGORY_CODE_MAP = {
        "蔬菜": "VEG",
        "水果": "FRT", 
        "肉類": "MEAT",
        "海鮮": "SEA",
        "乳製品": "DAIRY",
        "飲料": "BEV",
        "調料": "SAUCE",
        "麵食": "NOODLE",
        "米類": "RICE",
        "零食": "SNACK",
        "冷凍": "FROZ",
        "罐頭": "CAN",
        "餅乾": "COOK",
        "糖果": "CANDY",
        "茶葉": "TEA",
        "咖啡": "COFFEE",
        "酒類": "WINE",
        "調味": "SPICE",
        "油品": "OIL",
        "雜糧": "GRAIN"
    }
    
    @classmethod
    def extract_category_code(cls, category_name: str) -> str:
        """Extract category code from category name"""
        if not category_name:
            return "MISC"
        
        # Clean category name
        category_clean = category_name.strip()
        
        # Check direct mapping first
        for key, code in cls.CATEGORY_CODE_MAP.items():
            if key in category_clean:
                return code
        
        # If no direct match, extract first few characters
        # Remove common words and get meaningful part
        cleaned = re.sub(r'[/\-\s]+', '', category_clean)
        if len(cleaned) >= 3:
            return cleaned[:3].upper()
        else:
            return "MISC"
    
    @classmethod
    def extract_product_code(cls, product_name: str) -> str:
        """Extract product code from product name"""
        if not product_name:
            return "PROD"
        
        # Remove common words and punctuation
        clean_name = re.sub(r'[^\w\s]', '', product_name)
        words = clean_name.split()
        
        if len(words) == 0:
            return "PROD"
        elif len(words) == 1:
            # Single word, take first 4 characters
            word = words[0]
            return cls._transliterate_chinese(word)[:4].upper()
        else:
            # Multiple words, take first character of each word
            code = ""
            for word in words[:3]:  # Max 3 words
                code += cls._transliterate_chinese(word)[0] if word else "X"
            return code.upper().ljust(3, "X")
    
    @classmethod
    def extract_variant_code(cls, variant: Dict) -> str:
        """Extract variant code from variant dictionary"""
        if not variant:
            return ""
        
        codes = []
        
        # Size variant
        if "size" in variant:
            size = str(variant["size"]).upper()
            if "大" in size or "L" in size:
                codes.append("L")
            elif "中" in size or "M" in size:
                codes.append("M")
            elif "小" in size or "S" in size:
                codes.append("S")
            else:
                # Extract first meaningful character
                codes.append(re.sub(r'[^\w]', '', size)[:1] or "X")
        
        # Type variant
        if "type" in variant:
            type_val = str(variant["type"]).upper()
            if "有機" in type_val or "ORGANIC" in type_val:
                codes.append("ORG")
            elif "冷凍" in type_val or "FROZEN" in type_val:
                codes.append("FRZ")
            elif "新鮮" in type_val or "FRESH" in type_val:
                codes.append("FSH")
            else:
                codes.append(re.sub(r'[^\w]', '', type_val)[:3] or "STD")
        
        # Grade variant
        if "grade" in variant:
            grade = str(variant["grade"]).upper()
            codes.append(grade[:1] if grade else "A")
        
        return "-".join(codes) if codes else ""
    
    @classmethod
    def _transliterate_chinese(cls, text: str) -> str:
        """Simple transliteration for Chinese characters"""
        # Basic mapping for common Chinese characters
        char_map = {
            "蔬": "SHU", "菜": "CAI", "水": "SHUI", "果": "GUO",
            "肉": "ROU", "牛": "NIU", "豬": "ZHU", "雞": "JI",
            "魚": "YU", "蝦": "XIA", "蟹": "XIE", "貝": "BEI",
            "米": "MI", "麵": "MIAN", "麵條": "TIAO", "包": "BAO",
            "蛋": "DAN", "奶": "NAI", "茶": "CHA", "咖啡": "KA",
            "酒": "JIU", "醋": "CU", "油": "YOU", "鹽": "YAN",
            "糖": "TANG", "醬": "JIANG", "椒": "JIAO", "蔥": "CONG",
            "蒜": "SUAN", "薑": "JIANG", "有機": "ORG", "新鮮": "FRESH"
        }
        
        result = ""
        for char in text:
            if char in char_map:
                result += char_map[char]
            elif char.isalnum():
                result += char
        
        return result if result else text
    
    @classmethod
    async def get_next_sequence(
        cls, 
        db: AsyncSession, 
        category_code: str, 
        date_code: str
    ) -> int:
        """Get the next sequence number for a category/date combination"""
        # Try to get existing sequence
        stmt = select(SKUCodeSequence).where(
            SKUCodeSequence.category_code == category_code,
            SKUCodeSequence.date_code == date_code
        )
        result = await db.execute(stmt)
        sequence = result.scalar_one_or_none()
        
        if sequence:
            # Update existing sequence
            new_sequence = sequence.sequence_number + 1
            update_stmt = update(SKUCodeSequence).where(
                SKUCodeSequence.id == sequence.id
            ).values(
                sequence_number=new_sequence,
                last_used_at=func.now()
            )
            await db.execute(update_stmt)
            await db.commit()
            return new_sequence
        else:
            # Create new sequence
            new_sequence = SKUCodeSequence(
                id=str(uuid.uuid4()),
                category_code=category_code,
                date_code=date_code,
                sequence_number=1
            )
            db.add(new_sequence)
            await db.commit()
            return 1
    
    @classmethod
    async def generate_sku_code(
        cls,
        db: AsyncSession,
        product_name: str,
        category_name: str,
        variant: Optional[Dict] = None
    ) -> str:
        """Generate a unique SKU code"""
        # Extract components
        category_code = cls.extract_category_code(category_name)
        product_code = cls.extract_product_code(product_name)
        variant_code = cls.extract_variant_code(variant or {})
        date_code = datetime.now().strftime('%Y%m%d')
        
        # Get next sequence number
        sequence = await cls.get_next_sequence(db, category_code, date_code)
        
        # Build SKU code
        parts = [category_code, product_code]
        if variant_code:
            parts.append(variant_code)
        parts.extend([date_code, f"{sequence:04d}"])
        
        return "-".join(parts)
    
    @classmethod
    async def generate_product_id(cls) -> str:
        """Generate a unique product ID"""
        return str(uuid.uuid4())
    
    @classmethod
    async def generate_upload_id(cls) -> str:
        """Generate a unique upload batch ID"""
        return str(uuid.uuid4())
    
    @classmethod
    async def generate_upload_item_id(cls) -> str:
        """Generate a unique upload item ID"""
        return str(uuid.uuid4())
    
    @classmethod
    async def batch_generate_sku_codes(
        cls,
        db: AsyncSession,
        items: List[Dict]
    ) -> List[str]:
        """Generate SKU codes for a batch of items efficiently"""
        sku_codes = []
        
        # Group items by category to minimize database calls
        category_groups = {}
        for i, item in enumerate(items):
            category = item.get('category_name', 'MISC')
            if category not in category_groups:
                category_groups[category] = []
            category_groups[category].append((i, item))
        
        # Generate codes for each category group
        for category, category_items in category_groups.items():
            category_code = cls.extract_category_code(category)
            date_code = datetime.now().strftime('%Y%m%d')
            
            # Get current sequence for this category
            stmt = select(SKUCodeSequence).where(
                SKUCodeSequence.category_code == category_code,
                SKUCodeSequence.date_code == date_code
            )
            result = await db.execute(stmt)
            sequence = result.scalar_one_or_none()
            
            start_sequence = sequence.sequence_number + 1 if sequence else 1
            
            # Generate codes for all items in this category
            for j, (original_index, item) in enumerate(category_items):
                product_code = cls.extract_product_code(item.get('product_name', ''))
                variant_code = cls.extract_variant_code(item.get('variant', {}))
                current_sequence = start_sequence + j
                
                # Build SKU code
                parts = [category_code, product_code]
                if variant_code:
                    parts.append(variant_code)
                parts.extend([date_code, f"{current_sequence:04d}"])
                
                sku_code = "-".join(parts)
                
                # Insert at correct position
                while len(sku_codes) <= original_index:
                    sku_codes.append("")
                sku_codes[original_index] = sku_code
            
            # Update sequence in database
            if sequence:
                final_sequence = start_sequence + len(category_items) - 1
                update_stmt = update(SKUCodeSequence).where(
                    SKUCodeSequence.id == sequence.id
                ).values(
                    sequence_number=final_sequence,
                    last_used_at=func.now()
                )
                await db.execute(update_stmt)
            else:
                # Create new sequence
                final_sequence = start_sequence + len(category_items) - 1
                new_sequence = SKUCodeSequence(
                    id=str(uuid.uuid4()),
                    category_code=category_code,
                    date_code=date_code,
                    sequence_number=final_sequence
                )
                db.add(new_sequence)
        
        await db.commit()
        return sku_codes
    
    @classmethod
    def validate_sku_code_format(cls, sku_code: str) -> bool:
        """Validate SKU code format"""
        if not sku_code:
            return False
        
        # Pattern: CAT-PROD-[VAR-]YYYYMMDD-XXXX
        pattern = r'^[A-Z]{2,10}-[A-Z0-9]{1,10}(-[A-Z0-9\-]{1,15})?-\d{8}-\d{4}$'
        return bool(re.match(pattern, sku_code))
    
    @classmethod
    def parse_sku_code(cls, sku_code: str) -> Dict[str, str]:
        """Parse SKU code into components"""
        if not cls.validate_sku_code_format(sku_code):
            return {}
        
        parts = sku_code.split('-')
        if len(parts) < 4:
            return {}
        
        result = {
            'category_code': parts[0],
            'product_code': parts[1],
            'date_code': parts[-2],
            'sequence': parts[-1]
        }
        
        # Check if there's a variant code
        if len(parts) > 4:
            result['variant_code'] = '-'.join(parts[2:-2])
        
        return result