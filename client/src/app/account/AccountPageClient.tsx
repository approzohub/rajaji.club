"use client";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  OngoingBidsContent,
  AccountFormContent,
  GameHistoryContent,
  PaymentHistoryContent,
  WithdrawContent,
  AddUpiModal,
  AccountInfoContent
} from "../components/account";
import { AccountHeader } from "../components/account-header";
import { Footer } from "../components/footer";
import { WhatsAppFab } from "../components/whatsapp-fab";
import { useAuthStore } from "../../store/auth-store";
import { FiLogOut } from "react-icons/fi";
import Image from "next/image";
import { AlertModal } from "../components";
import { useAlert } from "../hooks";
import { ProtectedRoute } from "../../components/protected-route";
import { apiClient } from "../../lib/api";
import { setPageTitle, PAGE_TITLES } from "../../lib/page-title";

const menuItems = [
  { label: "Account" },
  { label: "Ongoing Bids" },
  { label: "Withdraw" },
  { label: "Game History" },
  { label: "Payment History" },
  { label: "Change Password" },
];

export function AccountPageClient() {
  const [activeMenu, setActiveMenu] = useState("Account");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  // Modal state
  const [isAddUpiOpen, setIsAddUpiOpen] = useState(false);
  const [upiName, setUpiName] = useState("");
  const [upiNumber, setUpiNumber] = useState("");
  const [refreshWithdrawKey, setRefreshWithdrawKey] = useState(0);
  const [isSubmittingUpi, setIsSubmittingUpi] = useState(false);
  const [paymentMethodsCount, setPaymentMethodsCount] = useState(0);
  // Alert modal state
  const { alert, showSuccess, showError, closeAlert } = useAlert();

  const router = useRouter();
  const { logout, user, updatePassword } = useAuthStore();

  // Sidebar state (moved up)
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  function handleSidebarOpen() { setSidebarOpen(true); }
  function handleSidebarClose() { setSidebarOpen(false); }

  // Responsive state
  const [isMobile, setIsMobile] = useState(false);
  const searchParams = useSearchParams();
  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 768);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const section = searchParams.get("section");
    if (section && menuItems.some(item => item.label === section)) {
      setActiveMenu(section);
    }
  }, [searchParams]);

  // Set page title based on active menu
  useEffect(() => {
    let title: string = PAGE_TITLES.ACCOUNT;
    switch (activeMenu) {
      case "Account":
        title = PAGE_TITLES.ACCOUNT;
        break;
      case PAGE_TITLES.ACCOUNT_MY_ACCOUNT:
        title = PAGE_TITLES.ACCOUNT_MY_ACCOUNT;
        break;
      case PAGE_TITLES.ACCOUNT_ONGOING_BIDS:
        title = PAGE_TITLES.ACCOUNT_ONGOING_BIDS;
        break;
      case PAGE_TITLES.ACCOUNT_WITHDRAW:
        title = PAGE_TITLES.ACCOUNT_WITHDRAW;
        break;
      case PAGE_TITLES.ACCOUNT_GAME_HISTORY:
        title = PAGE_TITLES.ACCOUNT_GAME_HISTORY;
        break;
      case PAGE_TITLES.ACCOUNT_PAYMENT_HISTORY:
        title = PAGE_TITLES.ACCOUNT_PAYMENT_HISTORY;
        break;
      default:
        title = PAGE_TITLES.ACCOUNT;
    }
    setPageTitle(title);
  }, [activeMenu]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");
    
    // Validation
    if (!newPassword.trim()) {
      setPasswordError("New password is required.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    
    setIsChangingPassword(true);
    
    try {
      const result = await updatePassword(newPassword);
      if (result.success) {
        // Clear form on success
        setNewPassword("");
        setConfirmPassword("");
        setPasswordError("");
        // Show success message
        showSuccess("Password updated successfully!");
      } else {
        const errorMessage = result.error || "Failed to update password";
        setPasswordError(errorMessage);
        // Also show error in alert modal
        showError(errorMessage);
      }
    } catch {
      const errorMessage = "An unexpected error occurred";
      setPasswordError(errorMessage);
      // Also show error in alert modal
      showError(errorMessage);
    } finally {
      setIsChangingPassword(false);
    }
  }

  async function handleAddUpiSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Validation
    if (!upiName.trim()) {
      showError("Name is required");
      return;
    }
    if (!upiNumber.trim()) {
      showError("UPI number is required");
      return;
    }
    
    // UPI ID validation (basic format check)
    const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+$/;
    if (!upiRegex.test(upiNumber)) {
      showError("Please enter a valid UPI ID (e.g., username@bank)");
      return;
    }

    setIsSubmittingUpi(true);
    try {
      const response = await apiClient.addPaymentMethod({
        name: upiName.trim(),
        upiId: upiNumber.trim(),
        isDefault: false // First payment method will be set as default automatically
      });

      if (response.error) {
        showError(response.error);
      } else {
        showSuccess("Payment method added successfully!");
        setIsAddUpiOpen(false);
        setUpiName("");
        setUpiNumber("");
        
        // Refresh payment methods count
        await fetchPaymentMethodsCount();
        
        // Trigger refresh of withdraw component
        setRefreshWithdrawKey(prev => prev + 1);
      }
    } catch {
      // Failed to add payment method
      showError("Failed to add payment method");
    } finally {
      setIsSubmittingUpi(false);
    }
  }

  function handleAddUpiClick() {
    setIsAddUpiOpen(true);
  }

  // Function to fetch payment methods count
  const fetchPaymentMethodsCount = async () => {
    try {
      const response = await apiClient.getPaymentMethods();
      if (response.data) {
        const responseData = response.data as { payments?: unknown[] } | unknown[];
        const payments = Array.isArray(responseData) 
          ? responseData 
          : responseData.payments || [];
        setPaymentMethodsCount(payments.length);
      }
    } catch {
      // Failed to fetch payment methods count
      console.error('Failed to fetch payment methods count');
    }
  };

  // Fetch payment methods count when component mounts
  useEffect(() => {
    fetchPaymentMethodsCount();
  }, []);

  function handleLogout() {
    logout();
    router.push("/");
  }

  let mainContent;
  if (activeMenu === "Account") {
    mainContent = <AccountInfoContent />;
  } else if (activeMenu === "Change Password") {
    mainContent = (
      <AccountFormContent
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        showConfirm={showConfirm}
        setShowConfirm={setShowConfirm}
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        confirmPassword={confirmPassword}
        setConfirmPassword={setConfirmPassword}
        handleSubmit={handleSubmit}
        error={passwordError}
        isLoading={isChangingPassword}
      />
    );
  } else if (activeMenu === "Ongoing Bids") {
    mainContent = <OngoingBidsContent />;
  } else if (activeMenu === "Withdraw") {
    mainContent = <WithdrawContent 
      key={refreshWithdrawKey} 
      onAddUpiClick={handleAddUpiClick} 
      onPaymentMethodDeleted={fetchPaymentMethodsCount}
    />;
  } else if (activeMenu === "Game History") {
    mainContent = <GameHistoryContent key="game-history" />;
  } else if (activeMenu === "Payment History") {
    mainContent = <PaymentHistoryContent />;
  } else {
    // Default to Account if no menu is selected
    mainContent = <AccountInfoContent />;
  }

  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen bg-[#091222] text-white w-full h-full" style={{ backgroundImage: "url('/bg.svg')", backgroundSize: "cover", backgroundPosition: "center" }}>
      <AccountHeader
        activeMenu={activeMenu}
        onMenuSelect={setActiveMenu}
        isSidebarOpen={isSidebarOpen}
        onSidebarOpen={handleSidebarOpen}
        onSidebarClose={handleSidebarClose}
      />
      <main className="flex-1 flex flex-col items-center justify-center w-full h-full md:px-2  py-8">
        <div className="w-full flex-1 max-w-6xl flex flex-col md:flex-row gap-8 md:gap-12 bg-transparent h-full">
          {/* Sidebar: only show on desktop */}
          {!isMobile && (
            <aside className="w-full md:w-80 flex flex-col gap-3">
              <h2 className="text-2xl font-bold mb-2"
                style={{
                  fontFamily: 'Poppins, sans-serif', fontWeight: 500,
                  fontStyle: 'medium', fontSize: 20, lineHeight: '24px',
                  letterSpacing: 0
                }}>{activeMenu}</h2>
              <span style={{
                fontFamily: 'Poppins', fontWeight: 500,
                fontStyle: 'normal', fontSize: 14, lineHeight: '24px',
                letterSpacing: 0, marginTop: '-18px'
              }}>Hi {user?.fullName || 'User'}</span>
              {menuItems.map((item) => (
                <button
                  key={item.label}
                  className={`flex items-center justify-between w-full px-6 py-3 rounded-md text-lg font-semibold transition-colors border border-[#232b3e] cursor-pointer ${activeMenu === item.label ? "bg-[#16c25f] text-white" : "bg-[#181f2e] text-white hover:bg-[#232b3e]"}`}
                  aria-current={activeMenu === item.label ? "page" : undefined}
                  onClick={() => setActiveMenu(item.label)}
                  style={{
                    fontFamily: 'Poppins', fontWeight: 500,
                    fontStyle: 'normal', fontSize: 14, lineHeight: '24px',
                    letterSpacing: 0,
                  }}
                >
                  {item.label}
                  {/* <span className="ml-2 text-xl">&#8250;</span> */}
                  <Image src="/right-chervolet.svg" alt="arrow-right" width={8} height={13} />
                </button>
              ))}
              {/* Logout Button */}
              <button
                className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-md text-lg font-semibold transition-colors border border-red-600 cursor-pointer bg-red-600 text-white hover:bg-red-700 mt-4"
                onClick={handleLogout}
                style={{
                  fontFamily: 'Poppins', fontWeight: 500,
                  fontStyle: 'normal', fontSize: 14, lineHeight: '24px',
                  letterSpacing: 0,
                }}
              >
                Logout
                <FiLogOut size={16} />

              </button>
            </aside>
          )}
          {/* Main Content */}
          <section className="flex-1 flex flex-col items-center w-full h-full md:mt-19 px-4 md:px-0" >
            {mainContent}
          </section>
        </div>
        {/* Add UPI Modal */}
        <AddUpiModal
          isOpen={isAddUpiOpen}
          onClose={() => setIsAddUpiOpen(false)}
          upiName={upiName}
          setUpiName={setUpiName}
          upiNumber={upiNumber}
          setUpiNumber={setUpiNumber}
          onSubmit={handleAddUpiSubmit}
          isSubmitting={isSubmittingUpi}
          currentPaymentCount={paymentMethodsCount}
        />
        {/* Alert Modal */}
        <AlertModal
          open={alert.open}
          onClose={closeAlert}
          message={alert.message}
          type={alert.type}
        />
        {/* Game Rules Section */}
        {/* {(activeMenu === "Payment History" || activeMenu === "Withdraw") && (
        <div className="w-full max-w-6xl mt-8 p-6 rounded-lg" >
          <span
            className="mb-4 ml-[-0.8rem]"
            style={{
              fontWeight: 400,
              fontSize: '18px',
              color: '#FFFFFF',
            }}
          >
            खेल के नियम
          </span>
          <ul
            className=" list-disc"
            style={{

              fontWeight: 400,
              fontSize: '16px',
              color: '#FFFFFF',
            }}
          >
            <li>It is a long established fact that a reader will be distracted by the readable</li>
            <li>The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters, as opposed to using</li>
            <li>It is a long established fact that a reader will be distracted by the readable</li>
            <li>The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters, as opposed to using</li>
            <li>It is a long established fact that a reader will be distracted by the readable</li>
            <li>Making it look like readable English. Many desktop publishing packages and web page editors now use.</li>
          </ul>
        </div>
        )} */}
      </main>
      <Footer />
      <WhatsAppFab />
      </div>
    </ProtectedRoute>
  );
} 