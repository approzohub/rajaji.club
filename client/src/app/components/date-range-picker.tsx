"use client";
import { useState, useEffect, useRef } from "react";

interface DateRangePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onDateRangeSelect: (startDate: string, endDate: string) => void;
}

export function DateRangePicker({ isOpen, onClose, onDateRangeSelect }: DateRangePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentMonth(new Date());
      setStartDate(null);
      setEndDate(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      // Check if the click is inside the dropdown containers
      const isInsideMonthPicker = target.closest('.month-picker-dropdown');
      const isInsideYearPicker = target.closest('.year-picker-dropdown');
      
      if (!isInsideMonthPicker && !isInsideYearPicker) {
        setShowMonthPicker(false);
        setShowYearPicker(false);
      }
    };

    if (showMonthPicker || showYearPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMonthPicker, showYearPicker]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  // Format date for API (YYYY-MM-DD) - keep this for backend compatibility
  const formatDateForAPI = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };



  const isDateInRange = (date: Date) => {
    if (!startDate) return false;
    if (!endDate) return date.getTime() === startDate.getTime();
    return date >= startDate && date <= endDate;
  };

  const isDateInHoverRange = (date: Date) => {
    if (!startDate || !hoverDate) return false;
    const start = startDate < hoverDate ? startDate : hoverDate;
    const end = startDate < hoverDate ? hoverDate : startDate;
    return date >= start && date <= end;
  };

  // Check if date is in the future (should be disabled)
  const isDateInFuture = (date: Date) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    return date > today;
  };

  // Check if month is in the future
  const isMonthInFuture = (year: number, month: number) => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    
    if (year > currentYear) return true;
    if (year === currentYear && month > currentMonth) return true;
    return false;
  };

  const handleDateClick = (date: Date) => {
    // Don't allow selecting future dates
    if (isDateInFuture(date)) return;

    if (!startDate || (startDate && endDate)) {
      setStartDate(date);
      setEndDate(null);
    } else {
      if (date < startDate) {
        setEndDate(startDate);
        setStartDate(date);
      } else {
        setEndDate(date);
      }
    }
  };

  const handleConfirm = () => {
    if (startDate && endDate) {
      // Send dates in YYYY-MM-DD format to API (backend compatibility)
      onDateRangeSelect(formatDateForAPI(startDate), formatDateForAPI(endDate));
      onClose();
    }
  };

  const handleCancel = () => {
    setStartDate(null);
    setEndDate(null);
    onClose();
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    // Don't allow going to future months
    if (!isMonthInFuture(nextMonth.getFullYear(), nextMonth.getMonth())) {
      setCurrentMonth(nextMonth);
    }
  };

  const goToYear = (year: number) => {
    // Don't allow selecting future years
    const currentYear = new Date().getFullYear();
    if (year <= currentYear) {
      setCurrentMonth(new Date(year, currentMonth.getMonth(), 1));
      setShowYearPicker(false);
    }
  };

  const goToMonth = (month: number) => {
    // Don't allow selecting future months
    if (!isMonthInFuture(currentMonth.getFullYear(), month)) {
      setCurrentMonth(new Date(currentMonth.getFullYear(), month, 1));
      setShowMonthPicker(false);
    }
  };

  const days = getDaysInMonth(currentMonth);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Generate years for year picker (current year - 10 to current year only)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 10 + i);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div 
        ref={pickerRef}
        className="bg-white rounded-lg shadow-lg p-4 sm:p-6 w-full max-w-sm mx-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base sm:text-lg font-bold text-black whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Select Date Range
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 cursor-pointer text-xl sm:text-2xl flex-shrink-0 ml-2"
          >
            ✕
          </button>
        </div>



        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={goToPreviousMonth}
            className="p-2 hover:bg-gray-100 rounded cursor-pointer flex-shrink-0"
          >
            ‹
          </button>
          
          <div className="flex items-center gap-2 flex-1 justify-center min-w-0">
            {/* Month Selector */}
            <div className="relative month-picker-dropdown flex-shrink-0">
              <button
                onClick={() => setShowMonthPicker(!showMonthPicker)}
                className="px-2 sm:px-3 py-1 text-sm sm:text-lg font-semibold text-black hover:bg-gray-100 rounded cursor-pointer whitespace-nowrap"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                {monthNames[currentMonth.getMonth()]}
              </button>
              {showMonthPicker && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 w-32 max-h-48 overflow-y-auto">
                  {monthNames.map((month, index) => {
                    const isFuture = isMonthInFuture(currentMonth.getFullYear(), index);
                    return (
                      <button
                        key={month}
                        onClick={() => goToMonth(index)}
                        disabled={isFuture}
                        className={`w-full px-3 py-2 text-left cursor-pointer text-black ${
                          index === currentMonth.getMonth() ? 'bg-blue-100 text-blue-600' : ''
                        } ${
                          isFuture ? 'text-gray-400 cursor-not-allowed bg-gray-100' : 'hover:bg-gray-100'
                        }`}
                      >
                        {month}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Year Selector */}
            <div className="relative year-picker-dropdown flex-shrink-0">
              <button
                onClick={() => setShowYearPicker(!showYearPicker)}
                className="px-2 sm:px-3 py-1 text-sm sm:text-lg font-semibold text-black hover:bg-gray-100 rounded cursor-pointer whitespace-nowrap"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                {currentMonth.getFullYear()}
              </button>
              {showYearPicker && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 w-24 max-h-48 overflow-y-auto">
                  {years.map((year) => {
                    const isFuture = year > currentYear;
                    return (
                      <button
                        key={year}
                        onClick={() => goToYear(year)}
                        disabled={isFuture}
                        className={`w-full px-3 py-2 text-left cursor-pointer text-black ${
                          year === currentMonth.getFullYear() ? 'bg-blue-100 text-blue-600' : ''
                        } ${
                          isFuture ? 'text-gray-400 cursor-not-allowed bg-gray-100' : 'hover:bg-gray-100'
                        }`}
                      >
                        {year}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={goToNextMonth}
            disabled={isMonthInFuture(currentMonth.getFullYear(), currentMonth.getMonth() + 1)}
            className={`p-2 rounded cursor-pointer flex-shrink-0 ${
              isMonthInFuture(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
                ? 'text-gray-400 cursor-not-allowed'
                : 'hover:bg-gray-100'
            }`}
          >
            ›
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 mb-4">
          {/* Day headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs sm:text-sm font-medium text-gray-600 py-1 sm:py-2">
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {days.map((day, index) => {
            if (!day) {
              return <div key={index} className="h-10"></div>;
            }

            const isSelected = startDate && day.getTime() === startDate.getTime();
            const isEndSelected = endDate && day.getTime() === endDate.getTime();
            const isInRange = isDateInRange(day);
            const isInHoverRange = isDateInHoverRange(day);
            const isToday = day.toDateString() === new Date().toDateString();
            const isFuture = isDateInFuture(day);

            return (
              <button
                key={index}
                onClick={() => handleDateClick(day)}
                onMouseEnter={() => !isFuture && setHoverDate(day)}
                onMouseLeave={() => setHoverDate(null)}
                disabled={isFuture}
                className={`
                  h-8 sm:h-10 w-full rounded text-xs sm:text-sm font-medium transition-colors relative cursor-pointer
                  ${isSelected || isEndSelected 
                    ? 'bg-blue-600 text-white font-bold' 
                    : isInRange || isInHoverRange
                    ? 'bg-blue-100 text-blue-800'
                    : isToday
                    ? 'bg-gray-200 text-black'
                    : isFuture
                    ? 'text-gray-400 cursor-not-allowed bg-gray-100'
                    : 'hover:bg-gray-100 text-black'
                  }
                `}
              >
                {day.getDate()}
                {(isSelected || isEndSelected) && (
                  <div className="absolute inset-0 rounded-full border-2 border-blue-800"></div>
                )}
              </button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleCancel}
            className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors cursor-pointer"
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!startDate || !endDate}
            className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
} 