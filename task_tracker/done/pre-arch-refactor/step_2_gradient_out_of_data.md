# Шаг 2: Вынести product.gradient из данных в геттер

> Зависит от: шаг 1 (не строго, но коммитим по порядку)
> Статус: [ ] pending

## Задача

Отделить представление (Tailwind-градиент) от данных товара. Сделать `Product.gradient` опциональным и брать значение через геттер с fallback, чтобы будущая БД-схема не тащила CSS-классы.

### В `src/lib/product.ts`

1. В типе `Product` сделать поле опциональным:
   ```ts
   gradient?: string;   // было: gradient: string;
   ```
2. Добавить геттер (импортировать `gradientFromString` из `@/lib/gradients`):
   ```ts
   import { gradientFromString } from '@/lib/gradients';

   export function getProductGradient(product: Product): string {
     return product.gradient ?? gradientFromString(product.slug);
   }
   ```
   **Важно про типы:** возвращаемый тип — `string` (НЕ `Gradient`). `gradientFromString` возвращает узкий union `Gradient`, но `product.gradient` это `string`. Аннотация `: string` корректна (Gradient — подмножество string, расширяется автоматически). НЕ ставить `: Gradient` — TS отвергнет `product.gradient` ветку.

   (Импорт `gradients` в `product.ts` — это ок, обратной зависимости нет: gradients.ts ни от чего не зависит.)

### Места использования `product.gradient` → перевести на геттер

- `src/components/ProductCard.tsx:32` — `<Placeholder ... gradient={product.gradient} />` → `gradient={getProductGradient(product)}`. Добавить импорт `getProductGradient`.
- `src/components/product/ProductDetail.tsx` (ветка `ProductDetailComingSoon`) — `gradient={product.gradient}` → `getProductGradient(product)`. Добавить импорт.

Проверить grep'ом, что других мест использования `product.gradient` / `.gradient` (на товаре) нет. Блог (`post.gradient`) — НЕ трогать, это отдельное поле BlogPost.

### Данные `src/data/products.ts`

Поле `gradient` в данных **оставить как есть** (10 товаров уже имеют осмысленные градиенты — это явные переопределения). Опциональность типа теперь позволяет новым товарам его не указывать. НЕ удалять существующие значения — это изменило бы вид карточек товаров без картинок.

> Смысл шага: тип больше не ТРЕБУЕТ gradient; представление доступно через геттер. Данные могут жить и без него. Это снимает обязательность Tailwind-класса в модели.

## Тесты

- e2e не завязаны на конкретные градиенты — должны остаться зелёными.
- Визуально: карточки товаров и страница comingSoon-товара выглядят так же (т.к. данные сохранили свои градиенты).

## Команды для верификации

```powershell
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

Дополнительно — убедиться что не осталось прямых обращений к `product.gradient` в компонентах. Точный паттерн (НЕ `\.gradient` — он даёт ложные срабатывания `cat.gradient` в CategoriesGrid и `post.gradient` в BlogCard/LatestPosts):

```powershell
# ожидаемый результат: 0 совпадений
Select-String -Path src\components\**\*.tsx -Pattern "product\.gradient"
```

## Критерии готовности

- [ ] `Product.gradient` опционально (`gradient?: string`)
- [ ] `getProductGradient(product): string` добавлен, использует fallback `gradientFromString(product.slug)`. Возвращаемый тип `string`, НЕ `Gradient`
- [ ] `ProductCard` и `ProductDetail` (comingSoon) используют геттер, не прямое поле
- [ ] Команда `Select-String -Path src\components\**\*.tsx -Pattern "product\.gradient"` возвращает **0 совпадений**
- [ ] Существующие значения gradient в `products.ts` сохранены
- [ ] Блоговый `gradient` не затронут (`post.gradient` остаётся)
- [ ] `npm run build` + `npm run test:e2e` зелёные
- [ ] Коммит: `refactor(product): decouple gradient from data via getter`
