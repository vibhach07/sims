import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AssessmentsAPI, APITestSeries } from '../../services/api';
import { usePurchase } from '../../contexts/PurchaseContext';
import { 
  FileCheck, Clock, Award, ArrowRight, CheckCircle2, 
  ShoppingCart, Loader2
} from 'lucide-react';

export const TestSeriesPage: React.FC = () => {
  const { isTestOwned, openCheckout } = usePurchase();
  const [tests, setTests] = useState<APITestSeries[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedModalTest, setSelectedModalTest] = useState<APITestSeries | null>(null);

  useEffect(() => {
    AssessmentsAPI.list()
      .then(data => setTests(data))
      .catch(err => setError(err.message ?? 'Failed to load test series'))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="py-12 bg-[#FFF9ED] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-[#A87519] bg-[#F8F4EA] px-3.5 py-1 rounded-full border border-[#E3D8BE]">
            Assessment Platform
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl font-extrabold text-[#061426]">
            SIMS National Mock Test Series
          </h1>
          <p className="text-[#687386] text-sm sm:text-base">
            Benchmark your examination readiness with timed computer-based tests, real negative marking algorithms, and question-by-question explanations.
          </p>
        </div>

        {/* Feature Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-[#E3D8BE] shadow-sm flex items-start gap-4">
            <div className="p-3 bg-[#091B31] text-[#D9A52E] rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-serif font-bold text-base text-[#061426]">Persistent Timer</h4>
              <p className="text-xs text-[#687386] mt-1">Realistic CBT timer with unresetting state across question navigation.</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-[#E3D8BE] shadow-sm flex items-start gap-4">
            <div className="p-3 bg-[#091B31] text-[#D9A52E] rounded-lg">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-serif font-bold text-base text-[#061426]">Instant Score &amp; Ranking</h4>
              <p className="text-xs text-[#687386] mt-1">Comprehensive breakdown of correct, incorrect, and unattempted marks.</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-[#E3D8BE] shadow-sm flex items-start gap-4">
            <div className="p-3 bg-[#091B31] text-[#D9A52E] rounded-lg">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-serif font-bold text-base text-[#061426]">In-Depth Explanations</h4>
              <p className="text-xs text-[#687386] mt-1">Stepwise mathematical derivations and conceptual references for every option.</p>
            </div>
          </div>
        </div>

        {/* Available Tests List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif font-bold text-2xl text-[#061426]">
              {isLoading ? 'Loading Tests…' : `Available Interactive Mock Tests (${tests.length})`}
            </h2>
            <span className="text-xs text-[#A87519] font-semibold bg-[#F8F4EA] px-3 py-1 rounded-md border border-[#E3D8BE]">
              National Benchmark Series
            </span>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Loading skeleton */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="sims-card p-6 animate-pulse space-y-3">
                  <div className="h-3 bg-[#E3D8BE] rounded w-2/3" />
                  <div className="h-5 bg-[#E3D8BE] rounded w-full" />
                  <div className="h-3 bg-[#E3D8BE] rounded w-4/5" />
                  <div className="h-3 bg-[#E3D8BE] rounded w-1/2" />
                </div>
              ))}
            </div>
          )}

          {/* Test cards */}
          {!isLoading && tests.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {tests.map((test) => {
                const owned = isTestOwned(String(test.id)) || test.is_entitled;
                const canAccess = !test.is_paid || owned;
                const price = test.price ? parseFloat(test.price) : undefined;
                const originalPrice = test.original_price ? parseFloat(test.original_price) : undefined;
                const discount = originalPrice && price ? Math.round((1 - price / originalPrice) * 100) : 0;

                return (
                  <div 
                    key={test.id}
                    tabIndex={0}
                    role="region"
                    aria-label={`Mock test: ${test.title}`}
                    className="sims-card sims-card-interactive p-6 flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-semibold text-[#A87519] uppercase tracking-wide px-2.5 py-0.5 rounded bg-[#F8F4EA] border border-[#E3D8BE]">
                          {test.exam.split('(')[0]}
                        </span>
                        <span className="text-xs font-bold text-[#061426] flex items-center gap-1.5 bg-[#FFF9ED] px-2 py-0.5 rounded border border-[#E3D8BE]/70">
                          <Clock className="w-3.5 h-3.5 text-[#D9A52E]" /> {test.duration_minutes} Mins
                        </span>
                      </div>

                      <h3 className="font-serif font-bold text-xl text-[#061426] group-hover:text-[#A87519] transition mb-2">
                        {test.title}
                      </h3>

                      <p className="text-xs text-[#687386] leading-relaxed mb-4 font-normal">
                        {test.description}
                      </p>

                      <div className="space-y-2 py-3 border-y border-[#E3D8BE]/60 text-xs text-[#263347] bg-[#F8F4EA]/50 rounded-lg px-3 mb-4">
                        <div className="flex justify-between">
                          <span className="text-[#687386]">Questions:</span>
                          <strong>{test.questions_count} Questions</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#687386]">Total Marks:</span>
                          <strong>{test.total_marks} Marks</strong>
                        </div>
                      </div>

                      {/* Price block */}
                      <div className="mb-4">
                        {test.is_paid && price ? (
                          <div className="flex items-center justify-between">
                            <div className="flex items-baseline gap-2">
                              <span className="font-serif font-bold text-xl text-[#061426]">
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
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Free Benchmark Examination</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[#E3D8BE]/50 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedModalTest(test)}
                        className="text-xs font-semibold text-[#061426] hover:text-[#A87519] underline"
                      >
                        View Details
                      </button>

                      {canAccess ? (
                        <Link
                          to={`/student/tests/${test.slug}`}
                          className="btn-sims-primary px-4 py-2 text-xs font-semibold flex items-center gap-1.5"
                        >
                          <span>Start Test</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      ) : (
                        <button
                          onClick={() => openCheckout({
                            id: String(test.id),
                            type: 'test',
                            title: test.title,
                            subtitle: `${test.questions_count} Questions • ${test.duration_minutes} mins`,
                            price: price!,
                            originalPrice,
                          })}
                          className="btn-sims-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5 shadow"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>Buy Test Series</span>
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && tests.length === 0 && (
            <div className="bg-white rounded-2xl border border-[#E3D8BE] p-12 text-center space-y-3">
              <FileCheck className="w-12 h-12 text-[#687386] mx-auto opacity-40" />
              <h3 className="font-serif font-bold text-xl text-[#061426]">No Tests Available Yet</h3>
              <p className="text-sm text-[#687386]">Test series will appear here once published by the admin.</p>
            </div>
          )}
        </div>

        {/* Test Details Modal */}
        {selectedModalTest && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setSelectedModalTest(null); }}
          >
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 border border-[#E3D8BE] shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#E3D8BE] pb-3">
                <span className="text-xs font-bold uppercase text-[#A87519]">{selectedModalTest.exam}</span>
                <button onClick={() => setSelectedModalTest(null)} className="text-[#687386] hover:text-[#061426] text-sm font-bold">✕</button>
              </div>

              <div>
                <h3 className="font-serif font-bold text-2xl text-[#061426]">{selectedModalTest.title}</h3>
                <p className="text-xs text-[#687386] mt-1 leading-relaxed">{selectedModalTest.description}</p>
              </div>

              <div className="space-y-2 bg-[#F8F4EA] p-4 rounded-xl border border-[#E3D8BE] text-xs">
                <div className="font-bold text-[#061426] mb-1">Test Pattern:</div>
                <div className="flex items-start gap-2 text-[#263347]">
                  <span className="text-[#D9A52E] font-bold">•</span>
                  <span>{selectedModalTest.questions_count} questions • {selectedModalTest.duration_minutes} minutes • {selectedModalTest.total_marks} total marks</span>
                </div>
                <div className="flex items-start gap-2 text-[#263347]">
                  <span className="text-[#D9A52E] font-bold">•</span>
                  <span>Answers submitted server-side. Results available immediately after submission.</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <span className="text-xs text-[#687386] block">Access Fee</span>
                  <span className="font-serif font-bold text-xl text-[#061426]">
                    {selectedModalTest.is_paid && selectedModalTest.price
                      ? `₹${parseFloat(selectedModalTest.price).toLocaleString('en-IN')}`
                      : 'Free'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setSelectedModalTest(null)}
                    className="px-4 py-2 border border-[#E3D8BE] rounded-xl text-xs font-semibold hover:bg-[#F8F4EA]"
                  >
                    Close
                  </button>
                  {(!selectedModalTest.is_paid || isTestOwned(String(selectedModalTest.id)) || selectedModalTest.is_entitled) ? (
                    <Link
                      to={`/student/tests/${selectedModalTest.slug}`}
                      className="btn-sims-primary px-5 py-2 text-xs font-bold flex items-center gap-1.5"
                    >
                      <span>Launch CBT</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  ) : (
                    <button
                      onClick={() => {
                        const t = selectedModalTest;
                        setSelectedModalTest(null);
                        openCheckout({
                          id: String(t.id),
                          type: 'test',
                          title: t.title,
                          price: parseFloat(t.price),
                          originalPrice: t.original_price ? parseFloat(t.original_price) : undefined,
                        });
                      }}
                      className="btn-sims-primary px-5 py-2 text-xs font-bold flex items-center gap-1.5"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>Buy Test Series</span>
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
