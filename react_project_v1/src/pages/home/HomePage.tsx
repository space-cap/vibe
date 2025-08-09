import Button from '../../components/ui/Button';

const HomePage = () => {
  return (
    <div className="text-center">
      <h1 className="text-4xl font-bold text-gray-800 mb-6">
        Welcome to React App
      </h1>
      <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
        This is a modern React application built with Vite, TypeScript, 
        Tailwind CSS, React Router, and React Query.
      </p>
      <div className="space-x-4">
        <Button variant="primary" size="lg">
          Get Started
        </Button>
        <Button variant="outline" size="lg">
          Learn More
        </Button>
      </div>
    </div>
  );
};

export default HomePage;