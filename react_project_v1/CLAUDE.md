# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tech Stack
- **Vite** - Fast build tool and development server
- **React 18** - UI library with TypeScript
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **React Query (@tanstack/react-query)** - Data fetching and state management
- **Storybook** - Component development and documentation
- **Vitest** - Unit testing framework
- **Testing Library** - React component testing utilities

## Development Commands
```bash
# Development
npm run dev        # Start development server (http://localhost:5173)

# Building
npm run build      # Create production build
npm run preview    # Preview production build

# Testing
npm run test       # Run tests in watch mode
npm run test:run   # Run tests once
npm run test:ui    # Run tests with UI

# Storybook
npm run storybook        # Start Storybook dev server
npm run build-storybook  # Build Storybook for production

# Type Checking
npm run type-check # Run TypeScript compiler check (if configured)
```

## Project Structure
```
src/
├── components/
│   ├── ui/           # Reusable UI components (Button, etc.)
│   ├── layout/       # Layout components (Header, Footer, Layout)
│   └── forms/        # Form-specific components
├── pages/
│   ├── home/         # Home page components
│   └── about/        # About page components
├── hooks/
│   └── api/          # API-related custom hooks
├── services/         # API services and external integrations
├── utils/            # Utility functions
├── types/            # TypeScript type definitions
├── store/            # State management (if needed)
└── assets/           # Static assets (images, icons)
    ├── images/
    └── icons/
```

## Architecture Guidelines

### Components
- UI components in `src/components/ui/` should be reusable and follow consistent design patterns
- Layout components handle page structure and navigation
- Use TypeScript interfaces for all component props
- Prefer composition over complex prop drilling

### Routing
- Routes are defined in `App.tsx` using React Router v6
- Page components are organized in `src/pages/[page-name]/`
- Use nested routes with the Layout component as the wrapper

### Data Fetching
- Use React Query for all API calls
- Custom hooks in `src/hooks/api/` wrap React Query functionality
- API service layer in `src/services/api.ts` handles HTTP requests
- Type all API responses using interfaces in `src/types/`

### Styling
- Tailwind CSS for all styling
- Use utility classes instead of custom CSS
- Component variants handled through className props
- Responsive design using Tailwind's responsive prefixes

### State Management
- React Query for server state
- React Context API for simple client state
- Local component state with useState/useReducer for component-specific state

## Environment Configuration
- Copy `.env.example` to `.env` for local development
- API base URL configured via `VITE_API_URL` environment variable
- All environment variables must be prefixed with `VITE_`

## Development Workflow
1. Run `npm install` after pulling changes
2. Use `npm run dev` for development
3. Follow the existing folder structure when adding new features
4. Use TypeScript interfaces for all data structures
5. Test components manually in the browser
6. Build the project before committing to ensure no build errors

## API Integration
- Base API service in `src/services/api.ts`
- Custom hooks in `src/hooks/api/useApi.ts` for React Query integration
- All API responses should be typed using interfaces in `src/types/`
- Error handling built into the API service layer

## Testing
- Unit tests use Vitest and React Testing Library
- Test files should end with `.test.tsx` or `.test.ts`
- Place tests next to the components they test
- Test configuration in `vitest.config.ts`
- Setup file in `src/test/setup.ts`

## Storybook
- Stories for UI components in `src/components/ui/*.stories.tsx`
- Use CSF (Component Story Format) 3.0
- Include different variants and states for each component
- Stories help with component development and documentation

## Available Components
- **UserProfile** - Complete user profile component with edit mode
- **Avatar** - User avatar with fallback initials
- **Button** - Reusable button with variants (primary, secondary, outline)
- **Input** - Form input with label and error states
- **Textarea** - Form textarea with label and error states
- **Layout components** - Header, Footer, Layout wrapper

## Example Pages
- **Home** (`/`) - Landing page with intro
- **About** (`/about`) - About page with tech stack info
- **Profile** (`/profile`) - User profile page with UserProfile component
