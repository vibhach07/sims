import React, { useState, useEffect } from 'react';
import { FacultyAPI, APIFaculty } from '../../services/api';
import { FacultyFlipCard } from '../../components/common/FacultyFlipCard';
import { Loader2, AlertCircle } from 'lucide-react';

export const FacultyDirectoryPage: React.FC = () => {
  const [faculty, setFaculty] = useState<APIFaculty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flippedFacultyId, setFlippedFacultyId] = useState<number | null>(null);

  useEffect(() => {
    FacultyAPI.list()
      .then(data => setFaculty(data))
      .catch(err => setError(err.message || 'Failed to load faculty directory.'))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="py-12 bg-[#FFF9ED] dark:bg-[#101113] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-[#A87519] dark:text-[#D5AD5B] bg-[#F8F4EA] dark:bg-[#181A1D] px-3.5 py-1 rounded-full border border-[#E3D8BE] dark:border-[#383D44]">
            Academic Leadership
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl font-extrabold text-[#061426] dark:text-[#F1EEE7]">
            Meet Our Expert Faculty
          </h1>
          <p className="text-[#687386] dark:text-[#85878B] text-sm sm:text-base">
            Dedicated educators with deep academic pedigree guiding aspirants across Raipur and Chhattisgarh to top national ranks. Tap any card to flip.
          </p>
        </div>

        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#D9A52E] mx-auto" />
            <p className="text-sm text-[#687386] dark:text-[#85878B]">Loading academic faculty roster from PostgreSQL...</p>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-2xl flex items-center gap-3 text-red-800 dark:text-red-300 max-w-2xl mx-auto">
            <AlertCircle className="w-6 h-6 flex-shrink-0" />
            <div>
              <p className="font-bold">Unable to load faculty</p>
              <p className="text-xs text-red-700 dark:text-red-400">{error}</p>
            </div>
          </div>
        ) : faculty.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-[#181A1D] rounded-2xl border border-[#E3D8BE] dark:border-[#383D44] max-w-xl mx-auto">
            <p className="text-sm text-[#687386] dark:text-[#85878B]">No faculty profiles currently published.</p>
          </div>
        ) : (
          /* Faculty 3D Flip Card Responsive Grid: desktop 4, tablet 2-3, mobile 1-2 */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {faculty.map((fac) => (
              <FacultyFlipCard
                key={fac.id}
                faculty={fac}
                isFlipped={flippedFacultyId === fac.id}
                onFlipToggle={() => setFlippedFacultyId(flippedFacultyId === fac.id ? null : fac.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
