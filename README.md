# Wallet System API

A robust wallet system API built with Express.js and MySQL, managing user accounts with core operations like account creation, top-ups, and charges. The system ensures precise currency calculations, prevents negative balances, and avoids duplicate transactions.

## Prerequisites

- **Node.js** (v18 or higher)
- **MySQL** database

## Setup

### Install Dependencies

```sh
npm install
```

### Set Up Environment Variables

Create a `.env` file with your MySQL credentials:

```
MYSQL_HOST=your-db-host
MYSQL_USER=your-db-user
MYSQL_PASSWORD=your-db-password
MYSQL_DATABASE=wallet_system
```

### Run Database Migrations

RUN THE FOLLOWING QUERY IN YOU MYSQL SERVER TO CREATE THE DATABASE

```
CREATE DATABASE wallet_system CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

```
THEN RUN THE FOLLOWING COMMAND TO MIGRATE


```sh

npm run migrate
```

## Start the Server

```sh
npm run dev
```

## API Endpoints

- **Create Account**
- **Top-up Account**
- **Charge Account**
- **Get Account Balance**

## Error Handling

The API handles various edge cases:

- Invalid or malformed requests
- Insufficient funds for charges
- Duplicate transactions
- Non-existent accounts
- Negative amounts
- Decimal precision for currency calculations

## COLLECTION

 -The collection file is present in the root of this project
 -You may import it and check the collection after runing ``` npm run dev ```

