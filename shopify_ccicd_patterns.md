# Shopify Theme CI/CD Patterns

## Purpose

This document defines standard Shopify theme deployment architectures that can be reused across projects.

---

# Option 1: Shopify Native GitHub Integration

## Overview

Shopify themes are connected directly to GitHub branches.

```text
feature/*
    ↓ PR
develop
    ↓ CI Sync
deploy-dev
    ↓ Shopify GitHub Integration
Dev Theme

main
    ↓ CI Sync
deploy-prod
    ↓ Shopify GitHub Integration
Production Theme
```

## Branch Structure

```text
main
develop

deploy-dev
deploy-prod

feature/*
```

## Theme Structure

```text
Dev Store
└── Published Theme
    └── Connected to deploy-dev

Production Store
└── Live Theme
    └── Connected to deploy-prod
```

## Workflow

### Development

```text
feature/cart
    ↓
develop
```

### Deployment

```text
develop
    ↓
GitHub Action
    ↓
deploy-dev
    ↓
Shopify Sync
    ↓
Dev Theme
```

### Production

```text
develop
    ↓ PR
main
    ↓
GitHub Action
    ↓
deploy-prod
    ↓
Shopify Sync
    ↓
Production Theme
```

## Pros

* No Shopify API tokens
* Native Shopify GitHub Integration
* Easy setup
* Minimal deployment code

## Cons

* settings_data.json complexity
* Requires deployment branches
* Harder to preserve customizer settings

## Best For

* Small stores
* Small teams
* Simple Shopify projects

---

# Option 2: Shopify CLI Deployment (Recommended)

## Overview

GitHub Actions deploy themes directly using Shopify CLI.

```text
feature/*
    ↓ PR
develop
    ↓ GitHub Action
shopify theme push
    ↓
Dev Theme

main
    ↓ GitHub Action
shopify theme push
    ↓
Production Theme
```

## Branch Structure

```text
main
develop

feature/*
```

## Theme Structure

```text
Dev Store
└── Dev Theme

Production Store
└── Release Theme or Live Theme
```

## Deployment Command

```bash
shopify theme push \
  --store STORE_NAME \
  --theme THEME_ID \
  --ignore config/settings_data.json
```

## GitHub Secrets

```text
SHOPIFY_DEV_STORE
SHOPIFY_DEV_THEME_ID
SHOPIFY_DEV_TOKEN

SHOPIFY_PROD_STORE
SHOPIFY_PROD_THEME_ID
SHOPIFY_PROD_TOKEN
```

## Files to Ignore

```text
config/settings_data.json
```

Reason:

* Theme editor settings
* App embeds
* Algolia toggles
* Homepage configuration
* Merchant content

These should not be overwritten during deployment.

## Pros

* No deployment branches
* Simpler Git history
* Supports --ignore
* Easier rollback
* Industry standard

## Cons

* Requires Shopify tokens
* Requires Theme IDs

## Best For

* Most client projects
* Agency work
* Growing teams
* Shopify Plus stores

---

# Option 3: Enterprise Shopify Deployment

## Overview

Separate environments exist for QA and Production.

```text
feature/*
    ↓
develop
    ↓
QA Theme

QA Approval
    ↓

main
    ↓
Release Theme

Publish
    ↓
Live Theme
```

## Branch Structure

```text
main
develop

feature/*
```

## Theme Structure

```text
Developer Preview Theme

QA Theme

Release Theme

Live Theme
```

## Workflow

### Development

```text
feature/cart
    ↓
develop
```

### QA

```text
develop
    ↓
QA Theme
```

### Production

```text
main
    ↓
Release Theme
    ↓
Manual Publish
    ↓
Live Theme
```

## Pros

* Safest deployment model
* QA before production
* Easy rollback
* No accidental production releases

## Cons

* More themes
* More process
* Requires team discipline

## Best For

* Shopify Plus
* High revenue stores
* Multiple developers
* Agency teams

---

# Recommended Decision Matrix

## Personal Learning Project

```text
Shopify CLI Deployment
```

## Small Client

```text
Shopify CLI Deployment
+
Release Theme
```

## Medium Client

```text
Shopify CLI Deployment
+
QA Theme
+
Release Theme
```

## Enterprise Client

```text
Shopify CLI Deployment
+
QA Theme
+
Release Theme
+
Live Theme
+
Approval Workflow
```

---

# General Rules

## Always Version Control

```text
assets/**
layout/**
sections/**
snippets/**
templates/**
config/settings_schema.json
locales/**
```

## Usually Do Not Deploy

```text
config/settings_data.json
```

Reason:

```text
Contains:

- Theme editor settings
- App embeds
- Algolia configuration
- Merchant content
- Homepage configuration
```

## Feature Branch Workflow

```text
feature/*
    ↓
develop
    ↓
main
```

Never deploy directly from feature branches.

## Preferred Modern Architecture

```text
feature/*
    ↓ PR
develop
    ↓ GitHub Action
shopify theme push --ignore config/settings_data.json
    ↓
Dev Theme

main
    ↓ GitHub Action
shopify theme push --ignore config/settings_data.json
    ↓
Release Theme
    ↓
Publish
    ↓
Live Theme
```

This is the default architecture recommended for most professional Shopify projects.
