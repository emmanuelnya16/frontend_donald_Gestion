# Architecture Backend Symfony - Gestion_Com

Ce document détaille la structure et la logique nécessaire pour migrer le backend actuel (localStorage) vers une API robuste avec **Symfony 7** et **PHP 8.2+**.

---

## 1. Configuration de Base & Authentification

### Bundles & Packages Recommandés

#### Backend (Symfony - via Composer)
- `symfony/orm-pack`: Pour Doctrine et la base de données.
- `lexik/jwt-authentication-bundle`: Pour la sécurité JWT.
- `nelmio/cors-bundle`: **CRUCIAL** pour autoriser React à appeler l'API.
- `symfony/serializer-pack`: Pour transformer vos entités en JSON.
- `symfony/validator`: Pour valider les données entrantes (quantités, prix).
- `symfony/maker-bundle` (--dev): Pour générer vos entités et contrôleurs.
- `knplabs/knp-paginator-bundle`: Pour la pagination des ventes et stocks.

#### Frontend (React - via npm/yarn)
- `axios`: Client HTTP pour appeler votre API Symfony.
- `jwt-decode`: Pour lire les informations du token (rôle, email) côté client.
- `react-query` (ou TanStack Query): Pour gérer le cache et l'état des données API.

---

## 2. Connexion React <-> Symfony (CORS & JWT)

### Configuration CORS (Symfony)
Dans `config/packages/nelmio_cors.yaml`, vous devez autoriser l'URL de votre application React :
```yaml
nelmio_cors:
    defaults:
        allow_origin: ['http://localhost:5173'] # URL de votre React en dev
        allow_methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
        allow_headers: ['Content-Type', 'Authorization']
        max_age: 3600
```

### Gestion du Token (React)
1. **Login**: React envoie les identifiants à `/api/login`, Symfony répond avec un `token`.
2. **Stockage**: Enregistrer le token dans `localStorage` ou dans un `Cookie` sécurisé.
3. **Intercepteur Axios**: Configurer Axios pour ajouter le header `Authorization: Bearer <token>` à chaque requête sortante.

### Authentification & Sécurité (Symfony)
- **User Interface**: Implémenter `UserInterface` et `PasswordAuthenticatedUserInterface`.
- **LexikJWT Configuration**: Dans `security.yaml`, assurez-vous que le `json_login` est configuré pour utiliser `email` comme identifiant :
  ```yaml
  json_login:
      check_path: /api/login_check
      username_path: email
      password_path: password
  ```
- **Roles**: 
  - `ROLE_ADMIN`: Accès total.
  - `ROLE_BOUTIQUE`: Accès limité à sa boutique.
- **Voters**: Utiliser des Symfony Voters pour vérifier si un vendeur a le droit de modifier un stock ou voir une vente.

---

## 3. Entités Doctrine (Modèle de Données)

### User
- `id`: UUID
- `email`: string (unique)
- `password`: string (hashed)
- `role`: string (ADMIN, SELLER)
- `boutique`: ManyToOne -> Boutique (nullable)
- `status`: string (ACTIVE, INACTIVE)

### Boutique
- `id`: UUID
- `name`: string
- `location`: string
- `address`: text
- `description`: text
- `status`: string (ACTIVE, INACTIVE)
- `stockItems`: OneToMany -> StockItem

### Product (Catalogue Global)
- `id`: UUID
- `name`: string
- `category`: string
- `basePrice`: decimal
- `description`: text
- `status`: string (ACTIVE, INACTIVE, PENDING)

### StockItem (Pivot Boutique <-> Produit)
- `id`: UUID
- `product`: ManyToOne -> Product
- `boutique`: ManyToOne -> Boutique
- `quantity`: integer
- `lowStockThreshold`: integer
- `localPrice`: decimal (nullable, surcharge du prix de base)

### Sale (Vente / Facture)
- `id`: UUID
- `invoiceNumber`: string (unique, ex: INV-2024-0001)
- `product`: ManyToOne -> Product
- `quantity`: integer
- `unitPrice`: decimal
- `totalPrice`: decimal
- `boutique`: ManyToOne -> Boutique (Boutique où la vente a eu lieu)
- `sourceBoutique`: ManyToOne -> Boutique (Boutique d'où provient le stock)
- `seller`: ManyToOne -> User
- `timestamp`: datetime_immutable
- `isTransfer`: boolean
- `status`: string (COMPLETED, CANCELLED, RETURNED)
- `correctionReason`: text (nullable)

### Transfer (Transfert Inter-Boutique)
- `id`: UUID
- `product`: ManyToOne -> Product
- `quantity`: integer
- `sourceBoutique`: ManyToOne -> Boutique
- `destBoutique`: ManyToOne -> Boutique
- `timestamp`: datetime_immutable
- `reason`: string
- `sale`: OneToOne -> Sale (nullable)

### StockMovement (Audit Trail)
- `id`: UUID
- `product`: ManyToOne -> Product
- `boutique`: ManyToOne -> Boutique
- `type`: string (IN, OUT, TRANSFER_IN, TRANSFER_OUT, ADJUSTMENT)
- `quantity`: integer
- `timestamp`: datetime_immutable
- `referenceId`: string (ID de la vente ou du transfert)
- `note`: string

---

## 3. Logique Métier (Services & Listeners)

### StockManager Service
C'est le cœur de la logique. Il doit contenir les méthodes :
1. `updateStock(Product $p, Boutique $b, int $qty, string $type, string $refId)`:
   - Modifie la quantité dans `StockItem`.
   - Crée automatiquement une entrée dans `StockMovement`.
2. `handleSale(Sale $sale)`:
   - Décrémente le stock de la `sourceBoutique`.
   - Si `isTransfer` est vrai, crée une entité `Transfer`.
3. `handleTransfer(Transfer $transfer)`:
   - Décrémente `sourceBoutique`.
   - Incrémente `destBoutique`.
   - Crée les deux mouvements de stock correspondants.

### Entity Listeners / Subscribers
- **SaleListener**: Avant de persister une `Sale`, générer automatiquement le `invoiceNumber` (ex: `INV-` + année + compteur).
- **StockMovementListener**: S'assurer que chaque mouvement est daté précisément.

---

## 4. Contrôleurs & API Endpoints

### AuthController
- `POST /api/login`: Retourne le token JWT.
- `GET /api/me`: Retourne les infos de l'utilisateur connecté.

### BoutiqueController
- `GET /api/boutiques`: Liste (Admin: toutes, Vendeur: la sienne).
- `POST /api/boutiques`: (Admin uniquement).

### ProductController
- `GET /api/products`: Catalogue global.
- `POST /api/products`: (Admin: création directe, Vendeur: création avec status PENDING).

### StockController
- `GET /api/stock`: État des stocks.
- `PATCH /api/stock/{id}`: Ajustement manuel ou changement de prix local.
- `GET /api/movements`: Historique des mouvements (filtrable par boutique).

### SaleController
- `POST /api/sales`: Enregistrement d'une vente. Déclenche la logique de stock.
- `GET /api/sales`: Historique des factures.
- `PATCH /api/sales/{id}/cancel`: Annulation d'une vente (réincrémente le stock).

---

## 5. Points Critiques à Implémenter

1. **Transactions SQL**: Utiliser `$entityManager->beginTransaction()` lors d'une vente pour s'assurer que si la mise à jour du stock échoue, la vente n'est pas enregistrée (Atomicité).
2. **Validation**: Utiliser les `Assert` de Symfony pour valider que la quantité vendue ne dépasse pas le stock disponible.
3. **DTOs (Data Transfer Objects)**: Utiliser des DTOs pour les requêtes complexes (ex: `SaleRequestDTO`) afin de séparer la structure de l'API de celle de la base de données.
4. **Pagination**: Utiliser `KnpPaginatorBundle` pour les listes de ventes et de mouvements qui deviendront très longues.
