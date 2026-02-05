import { useCategories, Category } from '@/hooks/useCategories';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface CategorySelectProps {
  value: string;
  onValueChange: (value: string) => void;
  type: 'entrata' | 'uscita';
  placeholder?: string;
}

export function CategorySelect({ value, onValueChange, type, placeholder = "Seleziona categoria" }: CategorySelectProps) {
  const { categories, getSubcategories } = useCategories();
  
  // Get parent categories for the specified type
  const parentCategories = categories.filter(c => c.type === type && !c.parent_id);
  
  // Helper to get icon display
  const getIconLabel = (category: Category) => {
    if (category.icon === 'custom' && category.custom_icon_url) {
      return (
        <img 
          src={category.custom_icon_url} 
          alt="" 
          className="w-4 h-4 rounded object-cover inline-block"
        />
      );
    }
    
    const iconMap: Record<string, string> = {
      'circle': '⚪',
      'home': '🏠',
      'car': '🚗',
      'utensils': '🍽️',
      'shopping-bag': '🛍️',
      'heart': '❤️',
      'briefcase': '💼',
      'plane': '✈️',
      'gift': '🎁',
      'music': '🎵',
      'book': '📚',
      'phone': '📱',
      'tv': '📺',
      'gamepad': '🎮',
      'coffee': '☕',
      'pill': '💊',
      'graduation-cap': '🎓',
      'dumbbell': '🏋️',
      'dog': '🐕',
      'baby': '👶',
      'wallet': '💰',
      'credit-card': '💳',
      'piggy-bank': '🐷',
      'receipt': '🧾',
    };
    
    return iconMap[category.icon || 'circle'] || '⚪';
  };

  // Build flat list with parent categories and their subcategories
  const buildCategoryList = () => {
    const items: { category: Category; isSubcategory: boolean }[] = [];
    
    parentCategories.forEach(parent => {
      items.push({ category: parent, isSubcategory: false });
      
      const subs = getSubcategories(parent.id);
      subs.forEach(sub => {
        items.push({ category: sub, isSubcategory: true });
      });
    });
    
    return items;
  };

  const categoryList = buildCategoryList();

  // Find selected category name for display
  const selectedCategory = categories.find(c => c.id === value);

  return (
    <Select onValueChange={onValueChange} value={value}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder}>
          {selectedCategory && (
            <span className="flex items-center gap-2">
              {getIconLabel(selectedCategory)}
              <span>{selectedCategory.name}</span>
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        {categoryList.map(({ category, isSubcategory }) => (
          <SelectItem 
            key={category.id} 
            value={category.id}
            className={cn(isSubcategory && "pl-8")}
          >
            <span className="flex items-center gap-2">
              {isSubcategory && <span className="text-muted-foreground">└</span>}
              {getIconLabel(category)}
              <span className={cn(isSubcategory && "text-sm")}>{category.name}</span>
            </span>
          </SelectItem>
        ))}
        {categoryList.length === 0 && (
          <div className="p-2 text-sm text-muted-foreground text-center">
            Nessuna categoria disponibile
          </div>
        )}
      </SelectContent>
    </Select>
  );
}