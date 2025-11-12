export function setPageTitle(pageName: string) {
  const baseTitle = "RajaJi - Trusted Betting Platform Online";
  const fullTitle = `${baseTitle} - ${pageName}`;
  
  if (typeof document !== 'undefined') {
    document.title = fullTitle;
  }
  
  return fullTitle;
}

export const PAGE_TITLES = {
  HOME: "Home",
  GAME: "Game", 
  ACCOUNT: "Account",
  ACCOUNT_MY_ACCOUNT: "My Account",
  ACCOUNT_ONGOING_BIDS: "Ongoing Bids",
  ACCOUNT_WITHDRAW: "Withdraw",
  ACCOUNT_GAME_HISTORY: "Game History",
  ACCOUNT_PAYMENT_HISTORY: "Payment History",
  RESULTS: "Results",
  LOGIN: "Login",
  REGISTER: "Register"
} as const; 