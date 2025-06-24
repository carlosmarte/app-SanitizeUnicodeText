import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { characterData } from "./Data.mjs";
import "./App.css";

function SpecialCharacterCleaner() {
  const [inputText, setInputText] = useState(characterData.sampleText);
  const [selectedChars, setSelectedChars] = useState(new Set());
  const [deletedChars, setDeletedChars] = useState(new Set());
  const [showPreview, setShowPreview] = useState(true);
  const [activeTab, setActiveTab] = useState("cleaned");
  const [copySuccess, setCopySuccess] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [openPanels, setOpenPanels] = useState(new Set());
  const [customReplacements, setCustomReplacements] = useState({});
  const [showDifferences, setShowDifferences] = useState(false);
  const [manuallyEditedText, setManuallyEditedText] = useState("");
  const [hasManualEdits, setHasManualEdits] = useState(false);

  // Refs for contentEditable elements to preserve cursor position
  const editableRef = useRef(null);
  const comparisonEditableRef = useRef(null);

  // Enhanced character detection with metadata
  const findSpecialCharacters = (text) => {
    const result = [];
    let match;
    const regex = new RegExp(characterData.specialCharRegex);

    while ((match = regex.exec(text)) !== null) {
      result.push({
        char: match[0],
        index: match.index,
        description: getCharacterDescription(match[0]),
      });
    }

    return result;
  };

  const getCharacterDescription = (char) => {
    return characterData.descriptions[char] || `Unknown special character`;
  };

  const foundCharacters = useMemo(
    () => findSpecialCharacters(inputText),
    [inputText]
  );

  // Group characters by type for better organization
  const groupedCharacters = useMemo(() => {
    const groups = {};
    foundCharacters.forEach((item) => {
      const key = item.char;
      if (!groups[key]) {
        groups[key] = {
          char: key,
          description: item.description,
          positions: [],
          count: 0,
        };
      }
      groups[key].positions.push(item.index);
      groups[key].count++;
    });
    return Object.values(groups);
  }, [foundCharacters]);

  const removeSpecialCharacters = (text, charsToRemove) => {
    let result = text;
    const sortedChars = [...charsToRemove].sort((a, b) => b.index - a.index);

    sortedChars.forEach(({ char, index }) => {
      if (selectedChars.has(char)) {
        // Use custom replacement if available, otherwise use default
        const replacement =
          customReplacements[char] !== undefined
            ? customReplacements[char]
            : characterData.replacements[char] !== undefined
            ? characterData.replacements[char]
            : "";
        result =
          result.substring(0, index) +
          replacement +
          result.substring(index + 1);
      }
    });

    return result;
  };

  const cleanedText = useMemo(() => {
    return removeSpecialCharacters(inputText, foundCharacters);
  }, [inputText, foundCharacters, selectedChars, customReplacements]);

  // Reset manual edits when input text changes
  useEffect(() => {
    setManuallyEditedText(cleanedText);
    setHasManualEdits(false);
  }, [cleanedText]);

  // Fixed: Use onBlur to prevent cursor jumping
  const handleManualEdit = useCallback(
    (event) => {
      const newText = event.target.innerText || event.target.textContent || "";
      if (newText !== manuallyEditedText) {
        setManuallyEditedText(newText);
        setHasManualEdits(newText !== cleanedText);
      }
    },
    [manuallyEditedText, cleanedText]
  );

  const getDisplayText = () => {
    return hasManualEdits ? manuallyEditedText : cleanedText;
  };

  const handleCharacterToggle = (char) => {
    const newSelected = new Set(selectedChars);
    const newOpenPanels = new Set(openPanels);

    if (newSelected.has(char)) {
      newSelected.delete(char);
      newOpenPanels.delete(char);
    } else {
      newSelected.add(char);
      newOpenPanels.add(char);
    }
    setSelectedChars(newSelected);
    setOpenPanels(newOpenPanels);
  };

  // Enhanced deletion function - actually removes characters from text
  const deleteCharacterFromText = (char) => {
    // Remove all instances of this character from the input text
    const regex = new RegExp(char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    const newText = inputText.replace(regex, "");

    // Update input text
    setInputText(newText);

    // Add to deleted characters set
    const newDeleted = new Set(deletedChars);
    newDeleted.add(char);
    setDeletedChars(newDeleted);

    // Remove from selected characters and custom replacements
    const newSelected = new Set(selectedChars);
    const newOpenPanels = new Set(openPanels);
    newSelected.delete(char);
    newOpenPanels.delete(char);
    setSelectedChars(newSelected);
    setOpenPanels(newOpenPanels);

    // Clear custom replacement
    if (customReplacements[char] !== undefined) {
      const newCustomReplacements = { ...customReplacements };
      delete newCustomReplacements[char];
      setCustomReplacements(newCustomReplacements);
    }
  };

  const togglePanel = (char) => {
    const newOpenPanels = new Set(openPanels);
    if (newOpenPanels.has(char)) {
      newOpenPanels.delete(char);
    } else {
      newOpenPanels.add(char);
    }
    setOpenPanels(newOpenPanels);
  };

  const handleCustomReplacement = (char, replacement) => {
    setCustomReplacements((prev) => ({
      ...prev,
      [char]: replacement,
    }));
  };

  const selectAll = () => {
    const allChars = new Set(groupedCharacters.map((g) => g.char));
    setSelectedChars(allChars);
  };

  const selectNone = () => {
    setSelectedChars(new Set());
  };

  const copyToClipboard = async (text) => {
    try {
      const textToCopy = text || getDisplayText();
      await navigator.clipboard.writeText(textToCopy);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  // Enhanced: Added download functionality
  const downloadText = (text, filename = "cleaned-text.txt") => {
    try {
      const textToDownload = text || getDisplayText();
      const element = document.createElement("a");
      const file = new Blob([textToDownload], { type: "text/plain" });
      element.href = URL.createObjectURL(file);
      element.download = filename;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      URL.revokeObjectURL(element.href);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2000);
    } catch (err) {
      console.error("Failed to download text: ", err);
    }
  };

  const highlightText = (text) => {
    if (!showPreview) return text;

    let highlightedText = text;
    const sortedChars = [...foundCharacters].sort((a, b) => b.index - a.index);

    sortedChars.forEach(({ char, index }) => {
      const isSelected = selectedChars.has(char);
      const hasCustomReplacement =
        customReplacements[char] && customReplacements[char] !== "";

      let highlightClass = "highlight highlight-detected";
      if (isSelected && hasCustomReplacement) {
        highlightClass = "highlight highlight-custom";
      } else if (isSelected) {
        highlightClass = "highlight highlight-selected";
      }

      const beforeText = highlightedText.substring(0, index);
      const afterText = highlightedText.substring(index + 1);
      const highlightedChar = `<span class="${highlightClass}">${char}</span>`;

      highlightedText = beforeText + highlightedChar + afterText;
    });

    return highlightedText;
  };

  const generateChangesTable = () => {
    const changes = [];
    foundCharacters.forEach(({ char }) => {
      if (selectedChars.has(char)) {
        const replacement =
          customReplacements[char] !== undefined
            ? customReplacements[char]
            : characterData.replacements[char] !== undefined
            ? characterData.replacements[char]
            : "";

        const existingChange = changes.find(
          (c) => c.original === char && c.replacement === replacement
        );
        if (existingChange) {
          existingChange.count++;
        } else {
          changes.push({
            original: char,
            replacement: replacement || "(removed)",
            count: 1,
            description: getCharacterDescription(char),
          });
        }
      }
    });
    return changes;
  };

  const highlightCleanedTextWithChanges = () => {
    const textToHighlight = getDisplayText();

    if (!showDifferences) return textToHighlight;

    if (!hasManualEdits) {
      // Only show automatic replacements with hover popovers
      let result = textToHighlight;
      const sortedChars = [...foundCharacters].sort(
        (a, b) => b.index - a.index
      );

      sortedChars.forEach(({ char, index }) => {
        if (selectedChars.has(char)) {
          const replacement =
            customReplacements[char] !== undefined
              ? customReplacements[char]
              : characterData.replacements[char] !== undefined
              ? characterData.replacements[char]
              : "";

          const beforeText = result.substring(0, index);
          const afterText = result.substring(index + replacement.length);

          if (replacement) {
            const highlightedChar = `<span class="highlight-replaced">${replacement}<span class="tooltip"><span class="tooltip-title">Original: "${char}"</span><span class="tooltip-subtitle">${getCharacterDescription(
              char
            )}</span></span></span>`;
            result = beforeText + highlightedChar + afterText;
          }
        }
      });

      return result;
    } else {
      // Show manual edit highlighting with popovers
      const cleanedWords = cleanedText.split(" ");
      const editedWords = manuallyEditedText.split(" ");
      const maxLength = Math.max(cleanedWords.length, editedWords.length);
      const highlightedWords = [];

      for (let i = 0; i < maxLength; i++) {
        const cleanedWord = cleanedWords[i] || "";
        const editedWord = editedWords[i] || "";

        if (cleanedWord !== editedWord) {
          highlightedWords.push(
            `<span class="highlight-manual">${editedWord}<span class="tooltip"><span class="tooltip-title">Manual edit</span><span class="tooltip-subtitle">Was: "${cleanedWord}"</span></span></span>`
          );
        } else {
          highlightedWords.push(editedWord);
        }
      }

      return highlightedWords.join(" ");
    }
  };

  const resetApplication = () => {
    setInputText("");
    setSelectedChars(new Set());
    setDeletedChars(new Set());
    setOpenPanels(new Set());
    setCustomReplacements({});
    setManuallyEditedText("");
    setHasManualEdits(false);
    setActiveTab("cleaned");
    setShowDifferences(false);
  };

  const loadSampleText = () => {
    setInputText(characterData.sampleText);
    setDeletedChars(new Set());
  };

  return (
    <div className="app-container">
      <div className="card">
        <h1 className="title">🔧 app-SanitizeUnicodeText</h1>
        <p className="text-gray-600 mb-6">
          Strips away all characters that aren’t considered safe or common.
        </p>
        <div className="flex gap-2">
          <button
            onClick={loadSampleText}
            className="btn btn-secondary btn-small"
          >
            📝 Load Sample Text
          </button>
          <button
            onClick={resetApplication}
            className="btn btn-secondary btn-small"
          >
            🔄 Reset All
          </button>
        </div>
      </div>

      <div className="grid lg-grid-cols-2 mb-6">
        {/* Input Section */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="subtitle">Input Text</h2>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="btn btn-secondary btn-small"
            >
              {showPreview ? "👁️ Hide Highlights" : "👁️ Show Highlights"}
            </button>
          </div>

          <textarea
            className="textarea"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste your text here..."
          />

          {showPreview && foundCharacters.length > 0 && (
            <div className="mt-4 p-3 bg-gray-50 border rounded-lg">
              <p className="text-sm text-gray-600 mb-2">
                Preview (highlighted characters):
              </p>
              <div
                dangerouslySetInnerHTML={{ __html: highlightText(inputText) }}
                className="font-mono text-sm leading-relaxed"
              />
            </div>
          )}
        </div>

        {/* Controls Section */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="subtitle flex items-center">
              Special Characters Found
              <span className="ml-2 badge badge-red">
                {foundCharacters.length}
              </span>
            </h2>
            <div className="space-x-2">
              <button
                onClick={selectAll}
                className="btn btn-secondary btn-small"
              >
                Select All
              </button>
              <button
                onClick={selectNone}
                className="btn btn-secondary btn-small"
              >
                Clear All
              </button>
            </div>
          </div>

          {groupedCharacters.length === 0 ? (
            <div className="alert alert-success">
              <span className="alert-icon">✅</span>
              <span>No special characters detected! Your text is clean.</span>
            </div>
          ) : (
            <div className="character-list">
              {groupedCharacters.map((group) => (
                <div key={group.char} className="character-item">
                  <div className="character-header">
                    <label className="character-label">
                      <input
                        type="checkbox"
                        checked={selectedChars.has(group.char)}
                        onChange={() => handleCharacterToggle(group.char)}
                        className="checkbox"
                      />
                      <div className="flex items-center gap-3 flex-1">
                        <span
                          className={`character-preview ${
                            selectedChars.has(group.char) ? "selected" : ""
                          }`}
                        >
                          {group.char}
                        </span>
                        <div className="character-info">
                          <div className="character-description">
                            {group.description}
                          </div>
                          <div className="character-details">
                            Count: {group.count} | Default: "
                            {characterData.replacements[group.char] ||
                              "(removed)"}
                            "
                          </div>
                        </div>
                        <div className="character-actions">
                          {selectedChars.has(group.char) && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  deleteCharacterFromText(group.char);
                                }}
                                className="btn btn-danger btn-small"
                                title={`DELETE ALL instances of "${group.char}" from text`}
                              >
                                🗑️ DELETE
                              </button>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  togglePanel(group.char);
                                }}
                                className="btn btn-secondary btn-small"
                              >
                                {openPanels.has(group.char)
                                  ? "▲ Hide"
                                  : "▼ Customize"}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </label>
                  </div>

                  {/* Sliding Panel */}
                  {selectedChars.has(group.char) && (
                    <div
                      className={`panel-content ${
                        openPanels.has(group.char) ? "expanded" : "collapsed"
                      }`}
                    >
                      <div className="panel-body">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Custom Replacement:
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={customReplacements[group.char] || ""}
                              onChange={(e) =>
                                handleCustomReplacement(
                                  group.char,
                                  e.target.value
                                )
                              }
                              placeholder={`Default: "${
                                characterData.replacements[group.char] ||
                                "(removed)"
                              }"`}
                              className="input"
                            />
                            <button
                              onClick={() =>
                                handleCustomReplacement(group.char, "")
                              }
                              className="btn btn-secondary btn-small"
                              title="Clear custom replacement"
                            >
                              Clear
                            </button>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Leave empty to use default replacement, or enter
                            custom text
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Enhanced: Only show deletion warning when there are deleted characters */}
          {deletedChars.size > 0 && (
            <div className="alert alert-danger">
              <div className="alert-icon">⚠️</div>
              <div>
                <p className="font-medium mb-1">Deletion Warning:</p>
                <p>
                  You have permanently deleted {deletedChars.size} character
                  type(s) from your text:{" "}
                  {Array.from(deletedChars)
                    .map((char) => `"${char}"`)
                    .join(", ")}
                  . This action cannot be undone unless you reload the original
                  text.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Output Section */}
      <div className="card">
        <div className="tab-list">
          <nav className="tab-nav">
            <button
              onClick={() => setActiveTab("cleaned")}
              className={`tab-button ${
                activeTab === "cleaned" ? "active" : ""
              }`}
            >
              Cleaned Text
            </button>
            <button
              onClick={() => setActiveTab("comparison")}
              className={`tab-button ${
                activeTab === "comparison" ? "active" : ""
              }`}
            >
              Original vs Clean
            </button>
          </nav>
        </div>

        {activeTab === "cleaned" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Cleaned Output
                {hasManualEdits && (
                  <span className="text-orange-600 text-sm ml-2">
                    (manually edited)
                  </span>
                )}
              </h3>
              <div className="space-x-2">
                <button
                  onClick={() => copyToClipboard(getDisplayText())}
                  disabled={copySuccess}
                  className={`btn ${
                    copySuccess ? "btn-success" : "btn-secondary"
                  }`}
                >
                  {copySuccess ? "✅ Copied!" : "📋 Copy"}
                </button>
                {/* Enhanced: Added download button */}
                <button
                  onClick={() => downloadText(getDisplayText())}
                  disabled={downloadSuccess}
                  className={`btn ${
                    downloadSuccess ? "btn-success" : "btn-secondary"
                  }`}
                >
                  {downloadSuccess ? "✅ Downloaded!" : "💾 Download"}
                </button>
                <button
                  onClick={() => setInputText("")}
                  className="btn btn-secondary"
                >
                  🗑️ Clear
                </button>
                {hasManualEdits && (
                  <button
                    onClick={() => {
                      setManuallyEditedText(cleanedText);
                      setHasManualEdits(false);
                    }}
                    className="btn btn-secondary"
                  >
                    ↺ Reset Edits
                  </button>
                )}
              </div>
            </div>

            <div
              ref={editableRef}
              className="editable-content"
              contentEditable
              suppressContentEditableWarning={true}
              onBlur={handleManualEdit}
            >
              {getDisplayText()}
            </div>

            <div className="alert alert-info">
              <p className="text-sm">
                <strong>Changes applied:</strong> {selectedChars.size} character
                type(s) selected for replacement
                {deletedChars.size > 0 && (
                  <span className="block mt-1 text-red-800">
                    <strong>Characters deleted:</strong> {deletedChars.size}{" "}
                    character type(s) permanently removed from text
                  </span>
                )}
                {hasManualEdits && (
                  <span className="block mt-1 text-orange-800">
                    <strong>Manual edits:</strong> Text has been manually
                    modified after automatic cleaning
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        {activeTab === "comparison" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Text with Changes</h3>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={showDifferences}
                  onChange={(e) => setShowDifferences(e.target.checked)}
                  className="checkbox"
                />
                <span className="text-sm font-medium">Highlight Changes</span>
              </label>
            </div>

            {showDifferences && (
              <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-4 text-sm flex-wrap">
                  <div className="flex items-center">
                    <span className="highlight highlight-replaced px-2 py-1 rounded mr-2">
                      Auto-replaced
                    </span>
                    <span className="text-gray-600">
                      Special character replacements
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="highlight highlight-manual px-2 py-1 rounded mr-2">
                      Manual edit
                    </span>
                    <span className="text-gray-600">User modifications</span>
                  </div>
                  <div className="flex items-center">
                    <span className="bg-red-100 text-red-700 px-2 py-1 rounded mr-2">
                      [deleted]
                    </span>
                    <span className="text-gray-600">
                      Character was permanently removed
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    Hover for details
                  </span>
                </div>
              </div>
            )}

            {/* Unified Content Block */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">
                  Cleaned Text {showDifferences && "(with change highlights)"}
                  {hasManualEdits && (
                    <span className="text-orange-600 text-sm ml-2">
                      (manually edited)
                    </span>
                  )}
                </h4>
                <div className="flex items-center gap-2">
                  {hasManualEdits && (
                    <button
                      onClick={() => {
                        setManuallyEditedText(cleanedText);
                        setHasManualEdits(false);
                      }}
                      className="btn btn-secondary btn-small"
                    >
                      ↺ Reset Edits
                    </button>
                  )}
                  <button
                    onClick={() => copyToClipboard(getDisplayText())}
                    className="btn btn-secondary btn-small"
                  >
                    📋 Copy
                  </button>
                  {/* Enhanced: Added download button */}
                  <button
                    onClick={() => downloadText(getDisplayText())}
                    className="btn btn-secondary btn-small"
                  >
                    💾 Download
                  </button>
                </div>
              </div>

              {showDifferences ? (
                <div className="space-y-2">
                  {/* Read-only highlighted view */}
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg min-h-24">
                    <div
                      className="font-mono text-sm whitespace-pre-wrap leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: highlightCleanedTextWithChanges(),
                      }}
                    />
                  </div>
                  {/* Separate editable area */}
                  <div className="p-4 bg-white border-2 border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-600 mb-2">
                      ✏️ Edit the text below (changes will be reflected above):
                    </p>
                    <div
                      ref={comparisonEditableRef}
                      className="font-mono text-sm whitespace-pre-wrap leading-relaxed min-h-24"
                      contentEditable
                      suppressContentEditableWarning={true}
                      onBlur={handleManualEdit}
                      style={{ outline: "none" }}
                    >
                      {getDisplayText()}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="editable-content">
                  <div
                    className="font-mono text-sm whitespace-pre-wrap leading-relaxed"
                    contentEditable
                    suppressContentEditableWarning={true}
                    onBlur={handleManualEdit}
                    style={{ outline: "none" }}
                  >
                    {getDisplayText()}
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-500 mt-2">
                💡 Click to edit the text directly. Changes will be highlighted
                when "Highlight Changes" is enabled.
              </p>
            </div>

            {/* Changes Summary Table */}
            {showDifferences && selectedChars.size > 0 && (
              <div>
                <h4 className="font-medium mb-3">Changes Summary</h4>
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Original Character</th>
                        <th>Description</th>
                        <th>Replaced With</th>
                        <th className="text-center">Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {generateChangesTable().map((change, index) => (
                        <tr key={index}>
                          <td>
                            <span className="font-mono bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
                              {change.original}
                            </span>
                          </td>
                          <td className="text-gray-600">
                            {change.description}
                          </td>
                          <td>
                            <span className="font-mono bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                              {change.replacement}
                            </span>
                          </td>
                          <td className="text-center">
                            <span className="badge badge-blue">
                              {change.count}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 text-sm text-gray-600">
                  Total automatic changes:{" "}
                  <strong>
                    {generateChangesTable().reduce(
                      (sum, change) => sum + change.count,
                      0
                    )}
                  </strong>{" "}
                  characters across{" "}
                  <strong>{generateChangesTable().length}</strong> different
                  types
                  {deletedChars.size > 0 && (
                    <span className="block mt-1 text-red-700">
                      🗑️ <strong>Permanent deletions:</strong>{" "}
                      {deletedChars.size} character type(s) completely removed
                      from source text
                    </span>
                  )}
                  {hasManualEdits && (
                    <span className="block mt-1 text-orange-700">
                      ✏️ <strong>Manual edits applied</strong> - text has been
                      further modified by user
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SpecialCharacterCleaner;
