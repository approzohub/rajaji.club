"use client";
import { useState, useEffect } from 'react';
import { 
  formatTimeForDisplay, 
  formatDateForDisplay, 
  getUserTimezone, 
  isUserInIST 
} from '../../lib/timezone';

export function TimezoneTest() {
  const [userTimezone, setUserTimezone] = useState<string>('');
  const [isInIST, setIsInIST] = useState<boolean>(false);
  const [testResults, setTestResults] = useState<Array<{
    original: string;
    converted: string;
    type: string;
  }>>([]);

  useEffect(() => {
    const tz = getUserTimezone();
    const ist = isUserInIST();
    setUserTimezone(tz);
    setIsInIST(ist);

    // Test timezone conversions
    const testCases = [
      { original: '9:30 AM', type: 'time' },
      { original: '2:15 PM', type: 'time' },
      { original: '11:45 PM', type: 'time' },
      { original: '15-12-2024', type: 'date' },
      { original: '01-01-2024', type: 'date' },
    ];

    const results = testCases.map(testCase => {
      let converted = '';
      if (testCase.type === 'time') {
        converted = formatTimeForDisplay(testCase.original);
      } else {
        converted = formatDateForDisplay(testCase.original);
      }

      return {
        original: testCase.original,
        converted,
        type: testCase.type
      };
    });

    setTestResults(results);
  }, []);

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h3 className="text-lg font-bold mb-4">Timezone Test</h3>
      
      <div className="mb-4">
        <p><strong>User Timezone:</strong> {userTimezone}</p>
        <p><strong>Is in IST:</strong> {isInIST ? 'Yes' : 'No'}</p>
      </div>

      <div className="mb-4">
        <h4 className="font-semibold mb-2">Conversion Tests:</h4>
        <div className="space-y-2">
          {testResults.map((result, index) => (
            <div key={index} className="text-sm">
              <span className="font-medium">{result.type.toUpperCase()}:</span>{' '}
              <span className="text-gray-600">{result.original}</span>{' '}
              <span className="text-gray-400">→</span>{' '}
              <span className="text-blue-600">{result.converted}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="text-xs text-gray-500">
        <p>Note: Times are converted from IST (Asia/Kolkata) to your local timezone.</p>
        <p>If you&apos;re already in IST, no conversion is applied.</p>
      </div>
    </div>
  );
} 