import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CandidateProfile } from '@/types/candidate.types';
import { ModalHeader } from './ModalHeader';
import { ContactSection } from './ContactSection';
import { SkillsSection } from './SkillsSection';
import { ExperienceSection } from './ExperienceSection';
import { EducationSection } from './EducationSection';
import { ProjectsSection } from './ProjectsSection';
import { CertificationsSection } from './CertificationsSection';

interface CandidateModalProps {
  isOpen: boolean;
  candidate: CandidateProfile | null;
  loading: boolean;
  error?: string | null;
  onClose: () => void;
}

export function CandidateModal({ isOpen, candidate, loading, error, onClose }: CandidateModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');

    const getFocusableElements = () => {
      if (!modalRef.current) return [] as HTMLElement[];
      return Array.from(modalRef.current.querySelectorAll<HTMLElement>(focusableSelectors)).filter(
        (element) => element.offsetParent !== null
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        const focusable = getFocusableElements();
        if (focusable.length === 0) return;

        const activeIndex = focusable.indexOf(document.activeElement as HTMLElement);
        if (e.shiftKey) {
          if (activeIndex === 0) {
            e.preventDefault();
            focusable[focusable.length - 1]?.focus();
          }
        } else {
          if (activeIndex === focusable.length - 1) {
            e.preventDefault();
            focusable[0]?.focus();
          }
        }
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    const focusTimer = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/50"
        >
          <motion.div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="candidate-modal-title"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-3xl border border-slate-700 bg-slate-950 shadow-2xl"
          >
            {loading ? (
              <div className="flex items-center justify-center h-96">
                <div className="space-y-4 w-full px-8">
                  <div className="h-8 bg-slate-800 rounded animate-pulse" />
                  <div className="h-4 bg-slate-800 rounded w-3/4 animate-pulse" />
                  <div className="space-y-2 mt-8">
                    <div className="h-4 bg-slate-800 rounded animate-pulse" />
                    <div className="h-4 bg-slate-800 rounded w-5/6 animate-pulse" />
                    <div className="h-4 bg-slate-800 rounded w-4/6 animate-pulse" />
                  </div>
                </div>
              </div>
            ) : error ? (
              <div className="space-y-4 px-8 py-10 text-center text-slate-200">
                <p className="text-lg font-semibold text-rose-300">Unable to load candidate profile</p>
                <p className="text-sm text-slate-400">{error}</p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-6 rounded-full bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-400"
                >
                  Close
                </button>
              </div>
            ) : candidate ? (
              <>
                <ModalHeader
                  name={candidate.name}
                  title={candidate.role}
                  company={candidate.company}
                  onClose={onClose}
                  closeButtonRef={closeButtonRef}
                />

                <div className="space-y-8 px-8 py-6">
                  <ContactSection
                    email={candidate.email}
                    phone={candidate.phone}
                    location={candidate.location}
                  />

                  <SkillsSection skills={candidate.skills} />

                  <ExperienceSection experience={candidate.experience} experienceSummary={candidate.experienceSummary} />

                  <EducationSection education={candidate.education} />

                  <ProjectsSection projects={candidate.projects} />

                  <CertificationsSection certifications={candidate.certifications} />
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-96 px-8 text-slate-400">
                <p>No candidate profile loaded.</p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
