# EdgeView - AsterDex Exchange Data Visualizer

EdgeView is a Next.js application designed to display and visualize data from the AsterDex cryptocurrency exchange. It provides an overview of market assets and a detailed account center for users to track their performance and activity on AsterDex.

## Tech Stack

*   **Next.js**: React framework for server-side rendering and static site generation.
*   **React**: JavaScript library for building user interfaces.
*   **TypeScript**: Superset of JavaScript for type safety.
*   **ShadCN UI**: Beautifully designed components built with Radix UI and Tailwind CSS.
*   **Tailwind CSS**: Utility-first CSS framework for rapid UI development.
*   **Lucide React**: Simply beautiful open-source icons.
*   **Genkit (Firebase AI)**: Integrated for potential future AI-driven features (though not actively used in the current data display focus).
*   **date-fns**: Modern JavaScript date utility library.
*   **AdSense**: Integrated for ad display.

## Features

### 1. Market Overview (Homepage)
*   Displays a summary of AsterDex's overall market metrics:
    *   Total Daily Volume
    *   Total Open Interest (calculated for top 20 symbols by volume)
    *   Total Daily Trades
*   Shows a detailed table of AsterDex assets (`AssetDataTable`):
    *   Symbol, Price (live via WebSocket)
    *   24h Change %, 24h High/Low
    *   Funding Rate, Next Funding Time
    *   Daily Volume (Quote Asset), Open Interest (Quote Asset)
    *   Daily Trades
    *   Mark Price, Index Price
    *   Sortable and searchable.

### 2. AsterDex Page (`/asterdex`)
*   **Detailed Asset Table**: Utilizes the `AssetDataTable` component (same as homepage) to show comprehensive public market data for AsterDex assets with live price updates via WebSocket.
*   **AsterDex Account Center**:
    *   Allows users to securely input their AsterDex API Key and Secret Key (stored locally in the browser's `localStorage`).
    *   **Security Note**: Users are strongly advised to create API keys with restricted permissions (e.g., read-only) and to use IP whitelisting on AsterDex for maximum security.
    *   Displays key account metrics:
        *   **Portfolio Value**: Total margin balance.
        *   **Total Unrealized PNL**: Live PNL on open positions.
        *   **Total Realized PNL**: Calculated from Income History API (last 7 days).
        *   **Total Commissions Paid**: Calculated from Income History API (last 7 days).
        *   **Net Funding Fees**: Calculated from Income History API (last 7 days).
        *   **Commission Rates**: Displays Taker/Maker rates for a default symbol (e.g., BTCUSDT).
        *   **Trade-Based Metrics**:
            *   Total Trades (Long/Short breakdown)
            *   Total Volume Traded (Long/Short breakdown)
            *   Total Fees Paid (from trades, with latest fee shown)
            *   These are calculated from fetched & cached user trades (up to 1000 recent per symbol initially, plus newer trades for symbols with active positions or cached history). They may not reflect complete lifetime account history.
        *   **Points Program Summary (Based on fetched/cached trades & income data)**:
            *   Previous Day's Volume (for Au Boost calculation: Taker Vol + 0.5 \* Maker Vol)
            *   Au Trader Boost Factor (Multiplier based on Previous Day's Volume)
            *   Rh Points (Base calculation: Taker Vol + 0.5 \* Maker Vol, excludes external boosts)
            *   Today's Total Volume (Taker Vol + 0.5 \* Maker Vol for the current UTC day)
    *   **WebSocket Integration**: After initial data load via REST API, the Account Center uses WebSockets to receive live updates for balances and positions.
    *   **Data Caching**: Account summary, income history, and user trades are cached in `localStorage` to speed up initial loads and reduce API calls. Incremental updates are fetched for trade history.
    *   **Referral Section**: Includes a display for a referral code and a link to the AsterDex referral page.
*   **AdSense Integration**: Includes placeholders for AdSense ad units.

## Getting Started

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-name>
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    ```
3.  **Set up environment variables (if any specific ones are needed beyond API keys entered in UI):**
    Create a `.env.local` file if necessary. (Currently, API keys are entered via the UI).

4.  **Run the development server:**
    ```bash
    npm run dev
    # or
    yarn dev
    # or
    pnpm dev
    ```
    Open [http://localhost:9002](http://localhost:9002) (or your configured port) with your browser to see the result.

## Building for Production

```bash
npm run build
npm run start
```

## AdSense Configuration

*   The main AdSense script is included in `src/app/layout.tsx`. You **must** replace `"ca-pub-8597282005680903"` with your actual AdSense Publisher ID.
*   Ad unit placeholders are in:
    *   `src/components/layout/header-nav.tsx` (for header ad)
    *   `src/app/page.tsx` (for mid-page and footer ads)
    *   `src/app/asterdex/page.tsx` (for mid-page and footer ads)
    You **must** replace `"YOUR_AD_SLOT_ID_..."` and the example ad slot in `header-nav.tsx` with your actual AdSense Ad Slot IDs.

## Important Notes

*   **API Rate Limits**: The application attempts to manage AsterDex API rate limits (2400 requests/minute) by caching data and using WebSockets for live updates in the Account Center. However, fetching extensive trade history for many symbols client-side can still be intensive.
*   **Data Accuracy**: Trade-derived metrics in the Account Center are based on the portion of trade history fetched and cached by the browser. For complete historical accuracy, especially for very active or old accounts, a backend data aggregation solution is recommended.
*   **API Key Security**: Storing API keys in `localStorage` is a client-side convenience for this application. For production use with real funds, always follow best security practices, including using restricted API permissions and IP whitelisting.
