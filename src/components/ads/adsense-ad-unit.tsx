
'use client';

import React, { useEffect, useRef } from 'react';

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
  const adContainerRef = useRef<HTMLDivElement>(null);
  const pushedOnce = useRef(false);

  useEffect(() => {
    // Don't proceed if placeholder IDs are used or if already pushed for this instance
    if (!adSlotId || !adClient || adSlotId.startsWith("YOUR_") || adClient.startsWith("ca-pub-YOUR_")) {
      return;
    }
    if (pushedOnce.current) {
      return;
    }

    const timer = setTimeout(() => {
      // Check if the component is still mounted and ref is available
      if (adContainerRef.current) {
        try {
          if (window.adsbygoogle) {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
            pushedOnce.current = true; // Mark as pushed
          } else {
            console.warn(`AdSense main script (adsbygoogle) not found when attempting to push ad for slot ${adSlotId}.`);
          }
        } catch (e) {
          console.error(`AdSense push error for slot ${adSlotId}:`, e);
        }
      }
    }, 100); // Delay of 100ms to allow layout to settle

    return () => {
      clearTimeout(timer); // Clean up the timer if the component unmounts
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array: run once after component mounts

  if (!adSlotId || !adClient || adSlotId.startsWith("YOUR_") || adClient.startsWith("ca-pub-YOUR_")) {
    return null; // Don't render if slot or client ID is a placeholder
  }

  return (
    <div
      ref={adContainerRef}
      className={className}
      style={{
        display: 'block',
        textAlign: 'center',
        minWidth: '100px', 
        minHeight: '50px',  
        ...style,
      }}
      {...props}
    >
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={adClient}
        data-ad-slot={adSlotId}
        data-ad-format={adFormat}
        data-full-width-responsive={responsive.toString()}
        key={adSlotId} // Using adSlotId as key can help React differentiate instances
      ></ins>
    </div>
  );
};
