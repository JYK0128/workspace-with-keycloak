# Keycloak + React 관리자 페이지 (Monorepo + Turborepo, BFF 포함) 예제

**Keycloak Docker + React(TypeScript) 관리자 UI + BFF(Backend for Frontend)** 구조를 npm workspace + **Turborepo** 기반 **monorepo**로 구성했습니다.
React는 Keycloak Admin REST API를 직접 호출하지 않고, `apps/bff/server.ts`를 통해 간접 호출합니다.

## 디렉터리 구조

```text
.
├─ apps/
│  ├─ web/   # Vite + React
│  └─ bff/   # Express + TypeScript
├─ keycloak/
├─ docker-compose.yml
└─ package.json (workspace root)
```

## 1) Keycloak + PostgreSQL 실행

```bash
docker compose up -d
```

- URL: http://localhost:8080
- Admin 계정: `admin / admin1234`
- PostgreSQL: `localhost:5432` (`keycloak / keycloak1234`, DB: `keycloak`)
- 기본 realm role 예시: `viewer`, `editor`, `auditor`

## 2) 앱 환경 변수 준비

```bash
cp apps/web/.env.example apps/web/.env
cp apps/bff/.env.example apps/bff/.env
```

## 3) 의존성 설치 (workspace root)

```bash
npm install
```

## 4) 전체 앱 동시 실행 (권장)

```bash
npm run dev
```

- Turborepo가 `apps/web`, `apps/bff`의 `dev` 스크립트를 병렬 실행합니다.

## 5) BFF 단독 실행

```bash
npm run dev:bff
```

- BFF URL: http://localhost:4000
- Health check: http://localhost:4000/health

## 6) React 단독 실행

```bash
npm run dev:web
```

- React URL: http://localhost:5173

## 기타 스크립트

```bash
npm run build
npm run typecheck
```

## 추가된 기능: 롤/권한 관리

### 1) Role 관리
- Role 생성
- Role 삭제

### 2) Role 권한(Composite) 관리
- 특정 Role 선택
- 다른 Role들을 Composite 권한으로 추가/제거
- 현재 Composite 권한 목록 확인

### 3) 사용자 RBAC 관리
- 사용자에 Role 할당/제거
- 현재 사용자 Role 목록 확인

## BFF API

- 사용자
  - `GET /api/users`
  - `POST /api/users`
  - `GET /api/users/:userId/roles`
  - `POST /api/users/:userId/roles`
  - `DELETE /api/users/:userId/roles`
- Role
  - `GET /api/roles`
  - `POST /api/roles`
  - `DELETE /api/roles/:roleName`
  - `GET /api/roles/:roleName/composites`
  - `POST /api/roles/:roleName/composites`
  - `DELETE /api/roles/:roleName/composites`

## 참고

- 현재 BFF는 로컬 개발 편의 목적의 최소 구현입니다.
- 운영 환경에서는 사용자 인증/권한 검증(JWT 검증 + 인가), 감사로그, 시크릿 분리 등을 권장합니다.
