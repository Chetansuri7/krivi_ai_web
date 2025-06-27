// app/components/chat/ModelSelector.tsx
import { ChevronDownIcon, FileDownIcon } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import type { AIModelConfig } from '~/lib/ai-models'; // Adjust path as needed

interface ModelSelectorProps {
  models: AIModelConfig[];
  selectedModel: AIModelConfig;
  onModelChange: (model: AIModelConfig) => void;
  disabled?: boolean;
  className?: string; // Allow passing custom classes
}

export function ModelSelector({
  models,
  selectedModel,
  onModelChange,
  disabled,
  className,
}: ModelSelectorProps) {
  // Responsive: detect if screen is small
  const [isNarrow, setIsNarrow] = useState(
    typeof window !== "undefined" ? window.innerWidth < 500 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsNarrow(window.innerWidth < 500);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = models.find(
      (m) =>
        m.model === event.target.value &&
        m.provider ===
          event.target.options[event.target.selectedIndex].dataset.provider
    );
    if (selected) {
      onModelChange(selected);
    }
  };

  return (
    <div className={`inline-block relative ${className || ''}`}>
      <select
        value={selectedModel.model} // Ensure value matches one of the option values
        onChange={handleChange}
        disabled={disabled}
        className="appearance-none text-xs font-medium bg-background hover:bg-muted border border-input rounded-md px-2.5 py-1.5 pr-7 focus:ring-1 focus:ring-primary focus:outline-none focus:border-primary disabled:opacity-70 disabled:cursor-not-allowed max-w-[120px] sm:max-w-[180px] truncate"
      >
        {models.map((model) => {
          // Show short name if available & screen is narrow, else displayName.
          const label =
            isNarrow && !!model.shortName ? model.shortName : model.displayName;
          return (
            <option
              key={`${model.provider}-${model.model}`}
              value={model.model}
              data-provider={model.provider}
              className="truncate"
              title={model.displayName}
            >
              {label}
            </option>
          );
        })}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-muted-foreground">
        <ChevronDownIcon className="h-4 w-4" />
      </div>
    </div>
  );
}