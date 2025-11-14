"use client";
import React, { useState, useEffect } from "react";
import { apiClient } from "../../lib/api";

export function GameRules() {
  const [rulesText, setRulesText] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGameRules = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await apiClient.getGameRules();
        if (response.data && response.data.text) {
          setRulesText(response.data.text);
        } else {
          setError("Game rules not available");
        }
      } catch (err: unknown) {
        console.error("Failed to fetch game rules:", err);
        setError("Failed to load game rules");
      } finally {
        setIsLoading(false);
      }
    };

    fetchGameRules();
  }, []);

  return (
    <div id="game-rules" className="w-full max-w-6xl mt-8 p-6 rounded-lg flex-shrink-0">
      <h3
        className="mb-4 text-white font-semibold"
        style={{
          fontFamily: 'Poppins',
          fontWeight: 600,
          fontSize: '20px',
          lineHeight: '24px',
          letterSpacing: '0%',
        }}
      >
        खेल के नियम
      </h3>
      {isLoading ? (
        <div className="text-white" style={{ fontFamily: 'Poppins' }}>
          Loading game rules...
        </div>
      ) : error ? (
        <div className="text-red-400" style={{ fontFamily: 'Poppins' }}>
          {error}
        </div>
      ) : rulesText ? (
        <div
          className="text-white whitespace-pre-line"
        style={{
          fontFamily: 'Poppins',
          fontWeight: 400,
          fontSize: '16px',
            lineHeight: '24px',
          letterSpacing: '0%',
          color: '#FFFFFF',
        }}
      >
          {rulesText}
        </div>
      ) : (
        <div className="text-white" style={{ fontFamily: 'Poppins' }}>
          No game rules available.
        </div>
      )}
    </div>
  );
} 