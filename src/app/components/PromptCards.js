'use client';

export default function PromptCards({ onPromptClick }) {
  const prompts = [
    {
      id: 1,
      title: "Write a to-do list for a personal project or task",
      icon: "📝",
      category: "Productivity"
    },
    {
      id: 2,
      title: "Generate an email to reply to a job offer",
      icon: "📧",
      category: "Work"
    },
    {
      id: 3,
      title: "Summarize this article or text for me in one paragraph",
      icon: "📄",
      category: "Summary"
    }
  ];

  const handleCardClick = (prompt) => {
    if (onPromptClick) {
      onPromptClick(prompt.title);
    }
  };

  return (
    <div className="w-full">
      <div className="text-center mb-6">
        <p className="text-sm text-muted-foreground">
          Use one of the most common prompts<br />
          below or use your own to begin
        </p>
      </div>
      
      <div className="flex justify-center">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl">
          {prompts.map((prompt) => (
            <button
              key={prompt.id}
              onClick={() => handleCardClick(prompt)}
              className="group p-4 bg-card hover:bg-accent border border-border rounded-lg transition-all duration-200 hover:shadow-md hover:scale-105 text-left"
            >
              <div className="flex flex-col h-full">
                {/* Icon */}
                <div className="text-2xl mb-3">
                  {prompt.icon}
                </div>
                
                {/* Content */}
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-card-foreground leading-relaxed">
                    {prompt.title}
                  </h3>
                </div>
                
                {/* Category Badge */}
                <div className="mt-3">
                  <span className="inline-block px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded-md">
                    {prompt.category}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}