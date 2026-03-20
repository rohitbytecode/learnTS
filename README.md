```md
# LearnTS

Backend project built with TypeScript and Node.js, focused on implementing patterns used in real-world SaaS applications.

This repository is used to explore scalable architecture, modular design, and multi-tenant concepts while keeping the codebase simple and maintainable.

---

## Stack

- TypeScript
- Node.js
- Express
- PostgreSQL (planned / optional)
- Docker

---

## Getting Started

### Clone the repository

```bash
git clone https://github.com/rohitbytecode/learnTS.git
cd learnTS
````

### Install dependencies

```bash
npm install
```

### Run in development

```bash
npm run dev
```

---

## Running with Docker

Make sure Docker is installed and running.

### Build the image

```bash
docker build -t learnts .
```

### Run the container

```bash
docker run -p 5000:5000 --env-file .env learnts
```

> The server will be available at `http://localhost:5000`

---

## Environment Variables

Create a `.env` file in the root:

```env
DATABASE_URL=Your_postgres_URL
POSTGRES_PASSWORD=Your_postgres_password
JWT_SECRET=your_JWT_secret
PORT=your_port
NODE_ENV=your_environment
```

---

## Project Structure

```
src/
├── modules/        # Feature-based modules (auth, user, org, etc.)
├── common/         # Shared utilities and middlewares
├── config/         # App and environment configuration
├── app.ts          # Express app setup
└── server.ts       # Entry point
```

---

## What This Project Covers

* Structuring a TypeScript backend
* Modular architecture (feature-based)
* Basics of SaaS backend design
* Clean code practices
* API development with Express

---

## Notes

* Code is intentionally kept simple to focus on structure and concepts
* Features will evolve gradually (auth, multi-tenancy, etc.)
* Avoid unnecessary abstractions unless required

---

## License

MIT