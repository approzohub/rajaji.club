// Shared styles for account pages
export const accountPageStyles = {
  // Container styles
  container: "w-full flex-1 bg-white rounded-lg shadow-lg p-4 flex flex-col gap-2",
  containerCompact: "w-full flex-1 bg-white rounded-lg shadow-lg p-3 flex flex-col gap-1",
  
  // Header styles
  header: {
    title: "text-xl font-semibold text-gray-900 mb-0",
    subtitle: "text-sm text-gray-600 mb-2",
    titleText: {
      fontFamily: 'Poppins',
      fontWeight: 500,
      fontStyle: 'medium',
      fontSize: '20px',
      lineHeight: '24px',
      letterSpacing: '0%',
      color: '#000000'
    },
    subtitleText: {
      fontFamily: 'Poppins',
      fontWeight: 400,
      fontStyle: 'regular',
      fontSize: '14px',
      lineHeight: '18px',
      letterSpacing: '0%',
      color: '#666666'
    }
  },
  
  // Content spacing
  content: "flex flex-col gap-4",
  
  // Card styles
  card: "bg-white rounded-lg border border-gray-200 p-4",
  
  // Table styles
  table: {
    container: "w-full rounded-lg overflow-hidden border border-gray-200",
    wrapper: "overflow-x-auto",
    header: "bg-[#222B44] text-white text-left",
    headerCell: "px-4 py-2 font-semibold text-sm",
    headerText: {
      fontFamily: 'Poppins',
      fontWeight: 500,
      fontStyle: 'semibold',
      fontSize: 14,
      lineHeight: '24px',
      letterSpacing: 0
    },
    body: "border-2 border-[#D8D8D8] border-t-0",
    row: "border-b border-gray-200",
    cell: "px-4 py-1 text-sm",
    cellText: {
      fontFamily: 'Poppins',
      fontWeight: 500,
      fontStyle: 'medium',
      fontSize: 14,
      lineHeight: '24px',
      letterSpacing: 0,
      color: '#535353'
    },
    alternateRow: "bg-[#F6F6F6]",
    emptyCell: "px-4 py-4 text-center text-gray-500"
  },
  
  // Form styles
  form: {
    container: "flex flex-col gap-2",
    label: {
      fontFamily: 'Poppins',
      fontWeight: 400,
      fontStyle: 'regular',
      fontSize: '16px',
      lineHeight: '20px',
      letterSpacing: '0%',
      color: '#000000'
    },
    input: "w-full px-4 py-3 text-base outline-none border border-gray-300 rounded-md text-black bg-white",
    button: "px-6 py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors",
    buttonSecondary: "px-6 py-3 bg-gray-200 text-gray-800 rounded-md font-medium hover:bg-gray-300 transition-colors"
  },
  
  // Loading and error states
  loading: "flex items-center justify-center py-4 text-gray-500",
  error: "bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md",
  empty: "text-center py-4 text-gray-500",
  
  // Pagination
  pagination: "flex items-center justify-between mt-4",
  paginationButton: "px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors",
  paginationButtonActive: "px-4 py-2 bg-blue-600 text-white rounded-md",
  
  // Status badges
  status: {
    pending: "bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium",
    approved: "bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium",
    rejected: "bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium",
    completed: "bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium"
  },
  
  // Amount display
  amount: {
    positive: "text-green-600 font-semibold",
    negative: "text-red-600 font-semibold",
    neutral: "text-gray-900 font-semibold"
  }
};

// Common text styles
export const textStyles = {
  heading: {
    fontFamily: 'Poppins',
    fontWeight: 500,
    fontStyle: 'medium',
    fontSize: '20px',
    lineHeight: '24px',
    letterSpacing: '0%',
    color: '#000000'
  },
  subheading: {
    fontFamily: 'Poppins',
    fontWeight: 500,
    fontStyle: 'medium',
    fontSize: '18px',
    lineHeight: '22px',
    letterSpacing: '0%',
    color: '#000000'
  },
  body: {
    fontFamily: 'Poppins',
    fontWeight: 400,
    fontStyle: 'regular',
    fontSize: '16px',
    lineHeight: '20px',
    letterSpacing: '0%',
    color: '#000000'
  },
  caption: {
    fontFamily: 'Poppins',
    fontWeight: 400,
    fontStyle: 'regular',
    fontSize: '14px',
    lineHeight: '18px',
    letterSpacing: '0%',
    color: '#666666'
  },
  small: {
    fontFamily: 'Poppins',
    fontWeight: 400,
    fontStyle: 'regular',
    fontSize: '12px',
    lineHeight: '16px',
    letterSpacing: '0%',
    color: '#666666'
  }
}; 