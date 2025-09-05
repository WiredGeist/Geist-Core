import { SettingsForm } from '@/components/settings/settings-form';

export default function SettingsPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="p-6 pb-0 shrink-0">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold font-headline">Settings</h1>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          <SettingsForm />
        </div>
      </div>

    </div>
  );
}