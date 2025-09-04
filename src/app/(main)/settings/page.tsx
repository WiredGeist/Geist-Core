import { SettingsForm } from '@/components/settings/settings-form';

export default function SettingsPage() {
  return (
    // STEP 1: Main container for the page.
    // - h-full: Take up the full height of the parent <main> element.
    // - flex flex-col: Use a column-based flex layout.
    // THIS IS THE KEY: By making the page a flex container, we gain more control
    // over its children's dimensions.
    <div className="flex flex-col h-full">

      {/* STEP 2: Header section.
          - p-6: Standard padding.
          - pb-0: No padding at the bottom to prevent extra space before the form.
          - shrink-0: Prevents this header from shrinking if the form is very long.
      */}
      <div className="p-6 pb-0 shrink-0">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold font-headline">Settings</h1>
        </div>
      </div>
      
      {/* STEP 3: The scrolling form container.
          - flex-1: Take up all available remaining vertical space.
          - overflow-y-auto: BECOME THE SCROLL CONTAINER for the content inside.
          - p-6: Provide padding for the form itself.
      */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          <SettingsForm />
        </div>
      </div>

    </div>
  );
}