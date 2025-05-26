
'use client';

import React, { useEffect, useRef } from 'react';

interface AdSenseAdUnitProps extends React.HTMLAttributes<HTMLDivElement> { // Changed HTMLModElement to HTMLDivElement
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
    // Don't proceed if slot ID is a placeholder
    if (!adSlotId || adSlotId.startsWith("YOUR_") || adSlotId === "ADSENSE_AD_SLOT_PLACEHOLDER") {
      // console.warn(`AdSenseAdUnit: Placeholder adSlotId used ("${adSlotId}"). Ad will not be rendered.`);
      return;
    }
     // Don't proceed if client ID is a placeholder
    if (!adClient || adClient.startsWith("ca-pub-YOUR_") || adClient === "ADSENSE_PUBLISHER_ID_PLACEHOLDER") {
      // console.warn(`AdSenseAdUnit: Placeholder adClient used ("${adClient}") for slot ${adSlotId}. Ad will not be rendered.`);
      return;
    }

    // Don't push if already pushed for this instance
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
        } catch (e: any) {
          if (e && e.message && e.message.includes("No slot size for availableWidth")) {
            // This specific error is common if the container isn't sized correctly yet.
            // console.warn(`AdSense push info for slot ${adSlotId}: ${e.message}`);
          } else {
            console.error(`AdSense push error for slot ${adSlotId}:`, e);
          }
        }
      }
    }, 100); // Delay of 100ms to allow layout to settle

    return () => {
      clearTimeout(timer); // Clean up the timer if the component unmounts
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array: run once after component mounts

  if (!adSlotId || adSlotId.startsWith("YOUR_") || adSlotId === "ADSENSE_AD_SLOT_PLACEHOLDER" ||
      !adClient || adClient.startsWith("ca-pub-YOUR_") || adClient === "ADSENSE_PUBLISHER_ID_PLACEHOLDER") {
    return null; // Don't render if slot or client ID is a placeholder
  }

  return (
    <div
      ref={adContainerRef}
      className={className}
      style={{
        display: 'block', // Ensure the container is block-level
        width: '100%',    // Attempt to take full width of parent
        textAlign: 'center', // Center the ad if it's narrower than the container
        ...style,
      }}
      {...props}
    >
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }} // This style is recommended by AdSense for responsive ads
        data-ad-client={adClient}
        data-ad-slot={adSlotId}
        data-ad-format={adFormat}
        data-full-width-responsive={responsive.toString()}
        key={adSlotId + "_ins"} // More unique key
      ></ins>
    </div>
  );
};
