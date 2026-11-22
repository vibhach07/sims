import React, { useState, useEffect } from 'react';
import { ResourcesAPI, APIResource } from '../../services/api';
import { usePurchase } from '../../contexts/PurchaseContext';
import { 
  FileText, Download, CheckCircle, 
  ShoppingCart, Sparkles
} from 'lucide-react';

export const StudyMaterialPage: React.FC = () => {
  const { isResourceOwned, openCheckout } = usePurchase();
  const [resources, setResources] = useState<APIResource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedExam, setSelectedExam] = useState<string>('all');
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [selectedModalResource, setSelectedModalResource] = useState<APIResource | null>(null);

  useEffect(() => {
    ResourcesAPI.list()
      .then(data => setResources(data))
      .catch(err => setError(err.message ?? 'Failed to load resources'))
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = selectedExam === 'all'
    ? resources
    : resources.filter(r => r.exam.toLowerCase().includes(selectedExam.toLowerCase()));

  const handleDownload = (res: APIResource) => {
    if (res.is_paid && !isResourceOwned(String(res.id)) && !res.is_entitled) {
      openCheckout({
        id: String(res.id),
        type: 'resource',
        title: res.title,
        subtitle: `${res.file_format} • ${res.pages} Pages`,
        price: parseFloat(res.price) || 349,
        originalPrice: res.original_price ? parseFloat(res.original_price) : undefined,
      });
      return;
    }
    setDownloadSuccess(res.title);
    setTimeout(() => setDownloadSuccess(null), 3500);
  };

  return (
    <div className="py-12 bg-[#FFF9ED] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-[#A87519] bg-[#F8F4EA] px-3.5 py-1 rounded-full border border-[#E3D8BE]">
            Resource Center
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl font-extrabold text-[#061426]">
            Study Resources &amp; Formula Sheets
          </h1>
          <p className="text-[#687386] text-sm sm:text-base">
            High-yield downloadable revision notes, previous years question analysis, and key formula booklets curated by SIMS faculty.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {['all', 'GATE', 'NET', 'NIMCET', 'CAT', 'NEET', 'CA Foundation'].map((item) => (
            <button
              key={item}
              onClick={() => setSelectedExam(item)}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition ${
                selectedExam === item
                  ? 'bg-[#061426] text-[#D9A52E] shadow'
                  : 'bg-white text-[#263347] border border-[#E3D8BE] hover:bg-[#F8F4EA]'
              }`}
            >
              {item === 'all' ? 'All Resources' : item}
            </button>
          ))}
        </div>

        {/* Download notification alert */}
        {downloadSuccess && (
          <div className="max-w-lg mx-auto bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl flex items-center gap-3 text-xs animate-fadeIn shadow-sm">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <span>
              <strong>Download initiated:</strong> "{downloadSuccess}". Entitlement confirmed; file transfer initiated.
            </span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="sims-card p-6 animate-pulse space-y-3">
                <div className="h-3 bg-[#E3D8BE] rounded w-2/3" />
                <div className="h-5 bg-[#E3D8BE] rounded w-full" />
                <div className="h-3 bg-[#E3D8BE] rounded w-4/5" />
              </div>
            ))}
          </div>
        )}

        {/* Resources Grid */}
        {!isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((res) => {
              const isDownloaded = downloadSuccess === res.title;
              const owned = isResourceOwned(String(res.id)) || res.is_entitled;
              const canDownload = !res.is_paid || owned;
              const price = res.price ? parseFloat(res.price) : undefined;
              const originalPrice = res.original_price ? parseFloat(res.original_price) : undefined;
              const discount = originalPrice && price ? Math.round((1 - price / originalPrice) * 100) : 0;

              return (
                <div 
                  key={res.id}
                  tabIndex={0}
                  role="region"
                  aria-label={`Study resource: ${res.title}`}
                  className={`sims-card sims-card-interactive p-6 flex flex-col justify-between group outline-none ${
                    isDownloaded ? 'sims-card-selected' : ''
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[11px] font-semibold text-[#A87519] bg-[#F8F4EA] px-2.5 py-1 rounded border border-[#E3D8BE]">
                        {res.exam}
                      </span>
                      <span className="text-xs text-[#687386] font-medium bg-[#FFF9ED] px-2 py-0.5 rounded border border-[#E3D8BE]/60">
                        {res.file_format} • {res.pages} Pages
                      </span>
                    </div>

                    <div className="flex items-start gap-3 mb-3">
                      <div className="p-2.5 rounded-lg bg-[#091B31] text-[#D9A52E] flex-shrink-0 mt-1">
                        <FileText className="w-5 h-5" />
                      </div>
                      <h3 className="font-serif font-bold text-lg text-[#061426] leading-snug group-hover:text-[#A87519] transition">
                        {res.title}
                      </h3>
                    </div>

                    <p className="text-xs text-[#687386] leading-relaxed mb-4 font-normal">
                      {res.description}
                    </p>

                    {/* Pricing or Free tag */}
                    <div className="mb-4 pt-3 border-t border-[#E3D8BE]/60">
                      {res.is_paid && price ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-baseline gap-2">
                            <span className="font-serif font-bold text-lg text-[#061426]">
                              ₹{price.toLocaleString('en-IN')}
                            </span>
                            {originalPrice && (
                              <span className="text-xs text-[#687386] line-through">
                                ₹{originalPrice.toLocaleString('en-IN')}
                              </span>
                            )}
                          </div>
                          {discount > 0 && (
                            <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded">
                              {discount}% OFF
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded">
                          ● Free Academic Resource
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#E3D8BE]/50 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setSelectedModalResource(res)}
                      className="text-xs font-semibold text-[#061426] hover:text-[#A87519] underline"
                    >
                      View Details
                    </button>
                    
                    {canDownload ? (
                      <button
                        onClick={() => handleDownload(res)}
                        className={`px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 rounded-lg transition ${
                          isDownloaded
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'btn-sims-primary shadow-sm'
                        }`}
                      >
                        {isDownloaded ? (
                          <>
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Ready</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5" />
                            <span>{owned ? 'Download' : 'Free Download'}</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => openCheckout({
                          id: String(res.id),
                          type: 'resource',
                          title: res.title,
                          subtitle: `${res.file_format} • ${res.pages} Pages`,
                          price: price!,
                          originalPrice,
                        })}
                        className="btn-sims-primary px-3.5 py-1.5 text-xs font-bold flex items-center gap-1.5 shadow"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>Buy Resource</span>
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && filtered.length === 0 && (
          <div className="bg-white rounded-2xl border border-[#E3D8BE] p-12 text-center space-y-3">
            <Sparkles className="w-12 h-12 text-[#687386] mx-auto opacity-40" />
            <h3 className="font-serif font-bold text-xl text-[#061426]">No Resources Available</h3>
            <p className="text-sm text-[#687386]">Study materials will appear here once uploaded by the admin.</p>
          </div>
        )}

        {/* Resource Details Modal */}
        {selectedModalResource && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setSelectedModalResource(null); }}
          >
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 border border-[#E3D8BE] shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#E3D8BE] pb-3">
                <span className="text-xs font-bold uppercase text-[#A87519]">{selectedModalResource.exam}</span>
                <button onClick={() => setSelectedModalResource(null)} className="text-[#687386] hover:text-[#061426] text-sm font-bold">✕</button>
              </div>

              <div>
                <h3 className="font-serif font-bold text-2xl text-[#061426]">{selectedModalResource.title}</h3>
                <p className="text-xs text-[#687386] mt-2 leading-relaxed">{selectedModalResource.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-[#F8F4EA] p-4 rounded-xl border border-[#E3D8BE] text-xs">
                <div>
                  <span className="text-[#687386] block">File Format</span>
                  <strong className="text-[#061426]">{selectedModalResource.file_format}</strong>
                </div>
                <div>
                  <span className="text-[#687386] block">Length</span>
                  <strong className="text-[#061426]">{selectedModalResource.pages} Pages</strong>
                </div>
                <div>
                  <span className="text-[#687386] block">Total Downloads</span>
                  <strong className="text-[#061426]">{selectedModalResource.downloads.toLocaleString()} Aspirants</strong>
                </div>
                <div>
                  <span className="text-[#687386] block">Access Rights</span>
                  <strong className="text-[#061426]">
                    {selectedModalResource.is_paid ? 'Single Purchase / Lifetime' : 'Open Access'}
                  </strong>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <span className="text-xs text-[#687386] block">Price</span>
                  <span className="font-serif font-bold text-xl text-[#061426]">
                    {selectedModalResource.is_paid && selectedModalResource.price
                      ? `₹${parseFloat(selectedModalResource.price).toLocaleString('en-IN')}`
                      : 'Free'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setSelectedModalResource(null)}
                    className="px-4 py-2 border border-[#E3D8BE] rounded-xl text-xs font-semibold hover:bg-[#F8F4EA]"
                  >
                    Close
                  </button>
                  {(!selectedModalResource.is_paid || isResourceOwned(String(selectedModalResource.id)) || selectedModalResource.is_entitled) ? (
                    <button
                      onClick={() => {
                        handleDownload(selectedModalResource);
                        setSelectedModalResource(null);
                      }}
                      className="btn-sims-primary px-5 py-2 text-xs font-bold flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Now</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        const r = selectedModalResource;
                        setSelectedModalResource(null);
                        openCheckout({
                          id: String(r.id),
                          type: 'resource',
                          title: r.title,
                          price: parseFloat(r.price),
                          originalPrice: r.original_price ? parseFloat(r.original_price) : undefined,
                        });
                      }}
                      className="btn-sims-primary px-5 py-2 text-xs font-bold flex items-center gap-1.5"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>Buy Resource</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
