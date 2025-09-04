import { GeistLogo } from '../geist-logo';

export const WelcomeMessage = () => {
  return (
    <div className="flex flex-col h-full">
      <div className="p-6">
        <GeistLogo className="text-foreground h-7 w-auto" />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center -mt-16">
        <div className="w-24 h-24" />
        <h2 className="text-2xl font-bold text-center">
          How can I help you today?
        </h2>
      </div>
    </div>
  );
};
