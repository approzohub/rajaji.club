"use client";
import { useAuthStore } from "../../../store/auth-store";
import { accountPageStyles, textStyles } from "./shared-styles";

export function AccountInfoContent() {
  const { user, mainBalance, bonusBalance } = useAuthStore();

  const formatIndianRupees = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active':
        return { bg: '#E6F7ED', text: '#02C060', border: '#02C060' };
      case 'banned':
        return { bg: '#FEE2E2', text: '#C23331', border: '#C23331' };
      case 'disabled':
        return { bg: '#F3F4F6', text: '#6B7280', border: '#9CA3AF' };
      default:
        return { bg: '#F3F4F6', text: '#6B7280', border: '#9CA3AF' };
    }
  };

  const statusStyle = getStatusColor(user?.status);

  return (
    <div className={accountPageStyles.container}>
      <h2 className={accountPageStyles.header.title} style={textStyles.heading}>Account Information</h2>
      
      <div className="mt-4 flex flex-col gap-6">
        {/* User Information Section */}
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="flex flex-col gap-1">
              <label style={{ ...textStyles.caption, color: '#666666' }}>Full Name</label>
              <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
                <span style={{ ...textStyles.body, color: '#000000', fontWeight: 500 }}>
                  {user?.fullName || 'N/A'}
                </span>
              </div>
            </div>

            {/* Phone Number */}
            <div className="flex flex-col gap-1">
              <label style={{ ...textStyles.caption, color: '#666666' }}>Phone Number</label>
              <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
                <span style={{ ...textStyles.body, color: '#000000', fontWeight: 500 }}>
                  {(user as any)?.phone || 'N/A'}
                </span>
              </div>
            </div>

            {/* Email */}
            {user?.email && (
              <div className="flex flex-col gap-1">
                <label style={{ ...textStyles.caption, color: '#666666' }}>Email</label>
                <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
                  <span style={{ ...textStyles.body, color: '#000000', fontWeight: 500 }}>
                    {user.email}
                  </span>
                </div>
              </div>
            )}

            {/* Role */}
            <div className="flex flex-col gap-1">
              <label style={{ ...textStyles.caption, color: '#666666' }}>Role</label>
              <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
                <span style={{ ...textStyles.body, color: '#000000', fontWeight: 500, textTransform: 'capitalize' }}>
                  {user?.role || 'N/A'}
                </span>
              </div>
            </div>

            {/* Status */}
            {user?.status && (
              <div className="flex flex-col gap-1">
                <label style={{ ...textStyles.caption, color: '#666666' }}>Status</label>
                <div 
                  className="px-4 py-3 rounded-lg border-2"
                  style={{
                    backgroundColor: statusStyle.bg,
                    borderColor: statusStyle.border
                  }}
                >
                  <span style={{ 
                    ...textStyles.body,
                    color: statusStyle.text,
                    fontWeight: 600,
                    textTransform: 'capitalize'
                  }}>
                    {user.status}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Wallet Balance Section */}
        <div className="flex flex-col gap-4">
          <h3 style={{ ...textStyles.subheading, marginBottom: '8px' }}>Wallet Balance</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Main Balance Card */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 shadow-md">
              <div className="flex flex-col gap-2">
                <span style={{ 
                  ...textStyles.caption,
                  color: '#FFFFFF',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Main Balance
                </span>
                <div className="flex items-baseline gap-1">
                  <span style={{ 
                    ...textStyles.body,
                    color: '#FFFFFF',
                    fontSize: '18px'
                  }}>
                    ₹
                  </span>
                  <span style={{ 
                    ...textStyles.heading,
                    color: '#FFFFFF',
                    fontSize: '28px',
                    fontWeight: 600
                  }}>
                    {formatIndianRupees(mainBalance)}
                  </span>
                </div>
              </div>
            </div>

            {/* Bonus Balance Card */}
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 shadow-md">
              <div className="flex flex-col gap-2">
                <span style={{ 
                  ...textStyles.caption,
                  color: '#FFFFFF',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Bonus Balance
                </span>
                <div className="flex items-baseline gap-1">
                  <span style={{ 
                    ...textStyles.body,
                    color: '#FFFFFF',
                    fontSize: '18px'
                  }}>
                    ₹
                  </span>
                  <span style={{ 
                    ...textStyles.heading,
                    color: '#FFFFFF',
                    fontSize: '28px',
                    fontWeight: 600
                  }}>
                    {formatIndianRupees(bonusBalance)}
                  </span>
                </div>
              </div>
            </div>

            {/* Total Balance Card */}
            <div className="bg-gradient-to-br from-[#02C060] to-[#16c25f] rounded-lg p-4 shadow-md border-2 border-[#02C060]">
              <div className="flex flex-col gap-2">
                <span style={{ 
                  ...textStyles.caption,
                  color: '#FFFFFF',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Total Balance
                </span>
                <div className="flex items-baseline gap-1">
                  <span style={{ 
                    ...textStyles.body,
                    color: '#FFFFFF',
                    fontSize: '20px'
                  }}>
                    ₹
                  </span>
                  <span style={{ 
                    ...textStyles.heading,
                    color: '#FFFFFF',
                    fontSize: '32px',
                    fontWeight: 700
                  }}>
                    {formatIndianRupees(mainBalance + bonusBalance)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

