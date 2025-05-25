
'use client';

import React, { useEffect } from 'react';

interface AdSenseAdUnitProps extends React.HTMLAttributes<HTMLModElement> {
  adClient: string; // e.g., "ca-pub-YOUR_PUBLISHER_ID"
  adSlotId: string; // e.g., "YOUR_AD_SLOT_ID"
  adFormat?: string; // e.g., "auto", "rectangle", "vertical", "horizontal"
  responsive?: boolean; // for data-full-width-responsive="true"
  className?: string;
  style?: React.CSSProperties;
}

declare global {
  interface Window {
    adsbygoogle?: { [key: string]: unknown }[];
  }
}

export const AdSenseAdUnit: React.FC<AdSenseAdUnitProps> = ({
  adClient,
  adSlotId,
  adFormat = "auto",
  responsive = true,
  className,
  style,
  ...props
}) => {
  useEffect(() => {
    if (adSlotId && adClient) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.error("AdSense push error:", e);
      }
    }
  }, [adSlotId, adClient]);

  if (!adSlotId || !adClient || adSlotId.startsWith("YOUR_") || adClient.startsWith("ca-pub-YOUR_")) {
    // Do not render if slot or client ID is missing or is a placeholder
    return null; 
  }

  return (
    <div
      className={className}
      style={{
        display: 'block', // Ensure the div takes up space
        textAlign: 'center',
        minWidth: '100px',  // Provide a fallback minimum width
        minHeight: '50px',   // Provide a fallback minimum height
        ...style,
      }}
      {...props}
    >
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }} // Standard for responsive ads
        data-ad-client={adClient}
        data-ad-slot={adSlotId}
        data-ad-format={adFormat}
        data-full-width-responsive={responsive.toString()}
      ></ins>
    </div>
  );
};
