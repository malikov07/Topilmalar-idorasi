from celery import shared_task
from .models import Item, Category

@shared_task
def process_item_images(item_id):
    try:
        from .utils import analyze_item_image

        item = Item.objects.get(id=item_id)
        image_obj = item.images.first()
        
        if image_obj:
            result = analyze_item_image(image_obj.image.path)

            # Extract data from the dictionary
            nouns = result.get("nouns", [])

            item.is_processed = True
            item.save()

            is_first = True
            for noun in nouns:
                print(f"Processing noun: {noun}")
                if noun.strip(): 
                    noun_clean = noun.capitalize() 

                    cat = Category.objects.filter(name__iexact=noun_clean).first()
                    
                    if not cat:
                        cat = Category.objects.create(name=noun_clean)
                        print(f"Category '{cat.name}' - Created just now!")
                    else:
                        print(f"Category '{cat.name}' - Already existed.")
                    
                    if is_first:
                        item.category = cat
                        print(f"Assigned primary category '{cat.name}' to item '{item.title}'")
                        is_first = False

                    item.categories.add(cat)
                    print(f"Added category '{cat.name}' to item '{item.title}'")

            item.save()

            return result 

    except Exception as e:
        return f"Error: {str(e)}"
