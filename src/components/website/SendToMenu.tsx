import { Mail, Share2, Image, FileText } from 'lucide-react';

interface SendToMenuProps {
  siteId: string;
  siteUrl?: string;
  brandAssets?: {
    logo?: string;
    palette?: Record<string, string>;
  };
}

export function SendToMenu({ siteId, siteUrl, brandAssets }: SendToMenuProps) {
  const sendToNewsletter = () => {
    const params = new URLSearchParams({
      source: 'website',
      siteId,
      ...(siteUrl && { url: siteUrl }),
      ...(brandAssets?.logo && { logo: brandAssets.logo }),
      ...(brandAssets?.palette && { palette: JSON.stringify(brandAssets.palette) })
    });

    const newsletterUrl = `/apps/newsletter/compose?${params.toString()}`;
    window.open(newsletterUrl, '_blank');
  };

  const sendToSocial = () => {
    const params = new URLSearchParams({
      source: 'website',
      siteId,
      ...(siteUrl && { url: siteUrl }),
      ...(brandAssets?.logo && { logo: brandAssets.logo })
    });

    const socialUrl = `/apps/social/post?${params.toString()}`;
    window.open(socialUrl, '_blank');
  };

  const sendToImages = () => {
    const params = new URLSearchParams({
      source: 'website',
      siteId,
      ...(brandAssets?.logo && { logo: brandAssets.logo }),
      ...(brandAssets?.palette && { palette: JSON.stringify(brandAssets.palette) })
    });

    const imagesUrl = `/apps/images/generate?${params.toString()}`;
    window.open(imagesUrl, '_blank');
  };

  const sendToAds = () => {
    const params = new URLSearchParams({
      source: 'website',
      siteId,
      ...(siteUrl && { url: siteUrl }),
      ...(brandAssets?.logo && { logo: brandAssets.logo }),
      ...(brandAssets?.palette && { palette: JSON.stringify(brandAssets.palette) })
    });

    const adsUrl = `/apps/ads/create?${params.toString()}`;
    window.open(adsUrl, '_blank');
  };

  return (
    <div className="relative group">
      <button
        className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
        title="Send to other apps"
      >
        <Share2 className="w-4 h-4" />
        <span>Send to...</span>
      </button>

      {/* Dropdown Menu */}
      <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
        <div className="py-2">
          <button
            onClick={sendToNewsletter}
            className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors"
          >
            <Mail className="w-4 h-4 text-gray-600" />
            <div>
              <div className="text-sm font-medium text-gray-900">Newsletter</div>
              <div className="text-xs text-gray-500">Draft launch email</div>
            </div>
          </button>

          <button
            onClick={sendToSocial}
            className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors"
          >
            <Share2 className="w-4 h-4 text-gray-600" />
            <div>
              <div className="text-sm font-medium text-gray-900">Social Media</div>
              <div className="text-xs text-gray-500">Share on social</div>
            </div>
          </button>

          <button
            onClick={sendToImages}
            className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors"
          >
            <Image className="w-4 h-4 text-gray-600" />
            <div>
              <div className="text-sm font-medium text-gray-900">Promo Images</div>
              <div className="text-xs text-gray-500">Generate visuals</div>
            </div>
          </button>

          <button
            onClick={sendToAds}
            className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors"
          >
            <FileText className="w-4 h-4 text-gray-600" />
            <div>
              <div className="text-sm font-medium text-gray-900">Ads Campaign</div>
              <div className="text-xs text-gray-500">Create ad copy</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
