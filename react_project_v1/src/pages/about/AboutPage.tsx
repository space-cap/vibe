const AboutPage = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold text-gray-800 mb-6">About</h1>
      <div className="prose prose-lg max-w-none">
        <p className="text-gray-600 leading-relaxed mb-6">
          This React application is built with modern tools and best practices:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-600">
          <li><strong>Vite</strong> - Fast build tool and development server</li>
          <li><strong>TypeScript</strong> - Type safety and better developer experience</li>
          <li><strong>Tailwind CSS</strong> - Utility-first CSS framework</li>
          <li><strong>React Router</strong> - Declarative routing for React</li>
          <li><strong>React Query</strong> - Data fetching and state management</li>
        </ul>
        <p className="text-gray-600 leading-relaxed mt-6">
          The project follows best practices with a well-organized folder structure,
          reusable components, and proper separation of concerns.
        </p>
      </div>
    </div>
  );
};

export default AboutPage;
