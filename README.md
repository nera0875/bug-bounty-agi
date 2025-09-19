# Bug Bounty AGI - MVP

AI-powered bug bounty request analysis and exploitation platform.

## 🚀 Features

- **Import HAR/Burp**: Simple textarea for pasting HTTP requests
- **AI Analysis**: Claude-powered vulnerability detection with business logic focus
- **Vector Search**: Find similar requests using pgvector embeddings
- **Feedback Loop**: Continuous improvement with success/error/partial feedback
- **Export**: Markdown format ready for HackerOne/Bugcrowd

## 🛠 Tech Stack

- **Frontend**: Next.js 15.5, React 19, TypeScript
- **UI**: Tailwind CSS, shadcn/ui
- **Database**: Supabase (PostgreSQL + pgvector)
- **AI**: OpenAI (embeddings), Anthropic Claude (analysis)

## 📦 Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/bug-bounty-agi.git
cd bug-bounty-agi
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env.local
```

Fill in your API keys:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`

4. Run development server:
```bash
npm run dev
```

## 🗄 Database Setup

The app requires Supabase with pgvector extension enabled.

Tables:
- `projects`: Project management
- `requests`: HTTP request storage with embeddings
- `sessions`: Analysis sessions with Claude history

## 🎯 Workflow

1. **Create Project**: Start with a new project
2. **Import Request**: Paste HAR/Burp request
3. **AI Analysis**: Get vulnerability suggestions
4. **Test & Feedback**: Mark results as working/error/partial
5. **Export**: Generate markdown report

## 🚀 Deployment

### Vercel
1. Connect GitHub repository
2. Add environment variables
3. Deploy

### Supabase
Database is already configured and hosted on Supabase cloud.

## 📝 License

MIT
