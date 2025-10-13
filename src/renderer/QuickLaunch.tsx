import React, { useMemo, useState, useCallback } from "react";
import { AdvancedTestingService } from "./services/AdvancedTestingService";
import type { TestGenerationRequest } from "./services/AdvancedTestingService";

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  keybinding?: string;
  category: "file" | "project" | "git" | "ai" | "view" | "tools";
  action: () => void | Promise<void>;
  closeOnExecute?: boolean;
}

interface QuickLaunchProps {
  isVisible: boolean;
  onToggle: () => void;
  onNewFile: () => void;
  onOpenFile: () => void;
  onShowGit: () => void;
  onShowProjects: () => void;
  onShowIntelligence: () => void;
  onToggleTerminal: () => void;
  onToggleSettings: () => void;
  advancedTestingService?: AdvancedTestingService;
  currentFilePath?: string;
}

const ICONS = {
  file: "[File]",
  project: "[Proj]",
  git: "[Git]",
  ai: "[AI]",
  view: "[View]",
  tools: "[Tool]"
} as const;

const QuickLaunch: React.FC<QuickLaunchProps> = ({
  isVisible,
  onToggle,
  onNewFile,
  onOpenFile,
  onShowGit,
  onShowProjects,
  onShowIntelligence,
  onToggleTerminal,
  onToggleSettings,
  advancedTestingService,
  currentFilePath
}) => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isGeneratingTests, setIsGeneratingTests] = useState<boolean>(false);
  const [testInsights, setTestInsights] = useState<string[]>([]);
  const [testFilePath, setTestFilePath] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const handleGenerateTests = useCallback(async () => {
    if (!advancedTestingService) {
      return;
    }

    if (!currentFilePath) {
      setTestError("Open a file to generate targeted tests.");
      setTestInsights([]);
      setTestFilePath(null);
      return;
    }

    setIsGeneratingTests(true);
    setTestError(null);
    setTestInsights([]);
    setTestFilePath(null);

    const request: TestGenerationRequest = {
      targetFile: currentFilePath,
      framework: "jest",
      testType: "unit",
      coverage: true,
      mocking: true,
      edgeCases: true,
      performance: false,
      aiAssisted: true
    };

    try {
      const result = await advancedTestingService.generateIntelligentTests(request);
      const insights: string[] = [];

      insights.push(`Generated ${result.testCases.length} candidate test cases.`);

      if (result.intelligence?.testSuggestions?.length) {
        insights.push("Top AI suggestions:");
        result.intelligence.testSuggestions.slice(0, 3).forEach((suggestion, index) => {
          const confidence = Math.round((suggestion.confidence ?? 0) * 100);
          insights.push(`${index + 1}. ${suggestion.description} (${confidence}% confidence)`);
        });
      }

      if (result.optimization?.recommendations?.length) {
        insights.push("Optimization tips:");
        result.optimization.recommendations.slice(0, 2).forEach(recommendation => {
          insights.push(`${recommendation.title}: ${recommendation.description}`);
        });
      }

      setTestInsights(insights);
      setTestFilePath(result.testFile);
    } catch (error) {
      setTestError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsGeneratingTests(false);
    }
  }, [advancedTestingService, currentFilePath]);

  const actions = useMemo<QuickAction[]>(() => {
    const baseActions: QuickAction[] = [
      {
        id: "new-file",
        title: "New File",
        description: "Create a new file",
        icon: ICONS.file,
        keybinding: "Ctrl+N",
        category: "file",
        action: onNewFile
      },
      {
        id: "open-file",
        title: "Open File",
        description: "Open an existing file",
        icon: ICONS.file,
        keybinding: "Ctrl+O",
        category: "file",
        action: onOpenFile
      },
      {
        id: "new-project",
        title: "New Project",
        description: "Start a new project setup",
        icon: ICONS.project,
        category: "project",
        action: onShowProjects
      },
      {
        id: "show-git",
        title: "View Git Panel",
        description: "Open the Git sidebar",
        icon: ICONS.git,
        category: "git",
        action: onShowGit
      },
      {
        id: "toggle-terminal",
        title: "Toggle Terminal",
        description: "Show or hide the integrated terminal",
        icon: ICONS.tools,
        keybinding: "Ctrl+`",
        category: "tools",
        action: onToggleTerminal
      },
      {
        id: "toggle-settings",
        title: "Open Settings",
        description: "Open IDE settings",
        icon: ICONS.view,
        keybinding: "Ctrl+,",
        category: "view",
        action: onToggleSettings
      },
      {
        id: "show-ai-panel",
        title: "AI Assistant",
        description: "Open AI assistant tools",
        icon: ICONS.ai,
        category: "ai",
        action: onShowIntelligence
      }
    ];

    if (advancedTestingService) {
      baseActions.push({
        id: "generate-tests",
        title: "Generate Tests for Current File",
        description: "Use AI to generate targeted unit tests",
        icon: ICONS.ai,
        category: "ai",
        action: handleGenerateTests,
        closeOnExecute: false
      });
    }

    return baseActions;
  }, [
    advancedTestingService,
    handleGenerateTests,
    onNewFile,
    onOpenFile,
    onShowProjects,
    onShowGit,
    onToggleTerminal,
    onToggleSettings,
    onShowIntelligence
  ]);

  const categories = useMemo(
    () => [
      { id: "all", name: "All", icon: "[*]" },
      { id: "file", name: "Files", icon: ICONS.file },
      { id: "project", name: "Projects", icon: ICONS.project },
      { id: "git", name: "Git", icon: ICONS.git },
      { id: "ai", name: "AI", icon: ICONS.ai },
      { id: "view", name: "View", icon: ICONS.view },
      { id: "tools", name: "Tools", icon: ICONS.tools }
    ],
    []
  );

  const filteredActions = useMemo(
    () =>
      actions.filter(action => {
        const lowerTitle = action.title.toLowerCase();
        const lowerDescription = action.description.toLowerCase();
        const query = searchTerm.toLowerCase();
        const matchesSearch = lowerTitle.includes(query) || lowerDescription.includes(query);
        const matchesCategory = selectedCategory === "all" || action.category === selectedCategory;
        return matchesSearch && matchesCategory;
      }),
    [actions, searchTerm, selectedCategory]
  );

  const handleActionClick = async (action: QuickAction) => {
    try {
      await Promise.resolve(action.action());
    } finally {
      if (action.closeOnExecute !== false) {
        onToggle();
      }
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="quick-launch-overlay">
      <div className="quick-launch">
        <div className="quick-launch-header">
          <h2>Quick Launch</h2>
          <button onClick={onToggle} className="close-btn" type="button">
            x
          </button>
        </div>

        <div className="quick-search">
          <input
            type="text"
            placeholder="Search actions..."
            value={searchTerm}
            onChange={event => setSearchTerm(event.target.value)}
            className="search-input"
            autoFocus
          />
        </div>

        <div className="category-tabs">
          {categories.map(category => (
            <button
              key={category.id}
              type="button"
              className={`category-tab ${selectedCategory === category.id ? "active" : ""}`.trim()}
              onClick={() => setSelectedCategory(category.id)}
            >
              <span className="category-icon">{category.icon}</span>
              <span className="category-name">{category.name}</span>
            </button>
          ))}
        </div>

        <div className="actions-grid">
          {filteredActions.length === 0 ? (
            <div className="no-actions">
              <p>No actions found for "{searchTerm}"</p>
            </div>
          ) : (
            filteredActions.map(action => (
              <div
                key={action.id}
                className="action-card"
                onClick={() => handleActionClick(action)}
                onKeyDown={event => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleActionClick(action);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className="action-icon">{action.icon}</div>
                <div className="action-info">
                  <h3>{action.title}</h3>
                  <p>{action.description}</p>
                  {action.keybinding && (
                    <div className="keybinding">
                      {action.keybinding.split("+").map((key, index) => (
                        <span key={`${action.id}-${key}-${index}`}>
                          {index > 0 && <span className="plus">+</span>}
                          <kbd>{key}</kbd>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {advancedTestingService && (
          <div className="quick-launch-testing">
            <h3>AI Testing Insights</h3>
            {isGeneratingTests && <div className="testing-status">Generating tailored tests...</div>}
            {testError && !isGeneratingTests && <div className="testing-error">{testError}</div>}
            {!isGeneratingTests && !testError && testInsights.length === 0 && (
              <div className="testing-placeholder">Use "Generate Tests for Current File" to see AI recommendations.</div>
            )}
            {!isGeneratingTests && testInsights.length > 0 && (
              <ul className="testing-insights">
                {testInsights.map((insight, index) => (
                  <li key={`${insight}-${index}`}>{insight}</li>
                ))}
              </ul>
            )}
            {testFilePath && (
              <div className="testing-output">
                Suggested test file: <code>{testFilePath}</code>
              </div>
            )}
          </div>
        )}

        <div className="quick-launch-footer">
          <p>
            Press <kbd>Escape</kbd> to close | Press <kbd>Enter</kbd> to execute selected action
          </p>
        </div>
      </div>
    </div>
  );
};

export default QuickLaunch;
