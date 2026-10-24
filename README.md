# unicodesnwrites

An independent product publication for visual essays, interactive AI explainers, shipped-project case studies, and author-made digital products.

## Features

- 📝 Product blog with Markdown/MDX-style authoring
- 🧪 Interactive concept labs embedded inside articles
- 🧭 Responsive, progress-aware article table of contents
- 🧱 Dedicated project showcase and case-study routes
- 🛍️ Owner-managed digital product shelf (Stripe integration)
- 📧 Newsletter system (double opt-in)
- 👤 Separate personal portfolio for bio, résumé, photos, and experience
- 📊 Custom analytics dashboard
- 🎨 Publication-grade light/dark brand system
- 📱 Fully responsive
- ✍️ Responsive private publishing studio and CMS
- ⚡ Built with Next.js 15

## Tech Stack

- **Framework:** Next.js 15 (App Router, React Server Components)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database:** MongoDB (Mongoose ODM)
- **Authentication:** NextAuth.js
- **Payments:** Stripe
- **Email:** Nodemailer + SendGrid
- **File Storage:** Vercel Blob
- **Hosting:** Vercel
- **Monitoring:** Sentry
- **Analytics:** Custom (MongoDB-based) + Vercel Analytics

## Getting Started

### Prerequisites

- Node.js 20+
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. Clone repository:
   ```bash
   git clone https://github.com/yourusername/unicodesnwrites-tech.git
   cd unicodesnwrites-tech
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your values
   ```

4. Run development server:
   ```bash
   npm run dev
   ```

5. Open http://localhost:3000

### Database Setup

1. Start MongoDB locally or use Atlas
2. Seed database:
   ```bash
   npm run db:seed
   ```

## Project Structure

```
unicodesnwrites-tech/
├── app/              # Next.js app directory
├── components/       # React components
├── lib/              # Utilities, models, services
├── public/           # Static assets
├── .agent-context/   # Agent persistence (DO NOT DELETE)
└── scripts/          # Deployment & maintenance scripts
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Lint code
- `npm run db:seed` - Seed development database
- `npm run seed:prod` - Seed production database

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment guide.

## Contributing

This is a personal publication and product studio. Contributions are not accepted.

## License

© 2026 Bhim Prasad Adhikari. All rights reserved. The source is public to read, not to reuse; see [LICENSE](LICENSE).
