'use client';

import React, { useState, useEffect } from 'react';
import { commentsApi, TravelPlanCommentDto } from '@/lib/api/comments';
import { useAuth } from '@/contexts/AuthContext';
import { getRelativeTime, formatLocalDate } from '@/lib/utils/dateUtils';

interface CommentBoxProps {
  travelPlanId: number;
  maxHeight?: string;
  showInput?: boolean;
}

const getImageUrl = (imageUrl?: string | null) => {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('http')) return imageUrl;
  return `${process.env.NEXT_PUBLIC_API_URL || 'https://routecraft.duckdns.org'}${imageUrl}`;
};

export default function CommentBox({ 
  travelPlanId, 
  maxHeight = '400px',
  showInput = true 
}: CommentBoxProps) {
  const { isAuthenticated, user } = useAuth();
  const [comments, setComments] = useState<TravelPlanCommentDto[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load comments
  useEffect(() => {
    loadComments();
  }, [travelPlanId]);

  const loadComments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const loadedComments = await commentsApi.getTravelPlanComments(travelPlanId);
      // Only show approved comments
      const approvedComments = loadedComments.filter(c => c.status === 1);
      setComments(approvedComments);
    } catch (err: any) {
      // Don't show error for empty results or 404
      if (err.status === 404 || err.message?.includes('404') || err.message?.includes('Not Found')) {
        setComments([]);
        setIsLoading(false);
        return;
      }
      // Network errors (backend not running)
      if (err.message?.includes('Failed to connect') || err.message?.includes('fetch')) {
        console.error('Backend connection error:', err);
        setError(null); // Don't show error for connection issues
        setComments([]);
        setIsLoading(false);
        return;
      }
      console.error('Error loading comments:', err);
      setError(null); // Don't show error, just log
      setComments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      setError('Please log in to write a comment.');
      return;
    }

    if (!newComment.trim()) {
      setError('Please write a comment.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const comment = await commentsApi.createComment({
        text: newComment.trim(),
        travelPlanID: travelPlanId,
      });

      // If comment is approved, add it to the list
      if (comment.status === 1) {
        setComments(prev => [comment, ...prev]);
      } else {
        // Comment is pending, show message
        setError('Your comment is pending approval. It will appear after approval.');
      }

      setNewComment('');
    } catch (err: any) {
      console.error('Error submitting comment:', err);
      
      // Handle specific error messages from backend
      let errorMessage = 'An error occurred while submitting the comment.';
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    // Use relative time for recent comments, full date for older ones
    if (diffInSeconds < 604800) { // Less than 7 days
      return getRelativeTime(dateString);
    } else {
      return formatLocalDate(dateString, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {showInput && (
        <form onSubmit={handleSubmitComment} className="flex flex-col gap-2">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={isAuthenticated ? 'Write your comment...' : 'Please log in to write a comment'}
            disabled={!isAuthenticated || isSubmitting}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a2e] disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
          />
          <div className="flex items-center justify-between">
            <button
              type="submit"
              disabled={!isAuthenticated || isSubmitting || !newComment.trim()}
              className="px-4 py-2 bg-[#1e3a2e] text-white rounded-lg hover:bg-[#2d5a3d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {isSubmitting ? 'Submitting...' : 'Post Comment'}
            </button>
            {!isAuthenticated && (
              <span className="text-xs text-gray-500">
                Please log in to write a comment
              </span>
            )}
          </div>
        </form>
      )}

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <h4 className="font-semibold text-gray-700">
          Comments ({comments.length})
        </h4>

        {isLoading ? (
          <div className="text-center text-gray-500 py-4">Loading comments...</div>
        ) : comments.length === 0 ? (
          <div className="text-center text-gray-500 py-4">
            No comments yet. Be the first to comment!
          </div>
        ) : (
          <div 
            className="flex flex-col gap-3 overflow-y-auto"
            style={{ maxHeight }}
          >
            {comments.map((comment) => (
              <div
                key={comment.commentID}
                className="bg-gray-50 rounded-lg p-3 border border-gray-200"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden ring-2 ring-white shadow-sm ${
                      getImageUrl(comment.authorImageUrl) ? 'bg-white' : 'bg-gradient-to-br from-[#1C4633] to-[#DA922B] text-white'
                    }`}>
                      {getImageUrl(comment.authorImageUrl) ? (
                        <img 
                          src={getImageUrl(comment.authorImageUrl)!} 
                          alt={comment.authorName || 'User'} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        comment.authorName?.[0]?.toUpperCase() || 'U'
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800 text-sm">
                        {comment.authorName || 'Anonymous User'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDate(comment.timestamp)}
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-gray-700 text-sm whitespace-pre-wrap">
                  {comment.text}
                </p>
                {comment.toxicityScore !== null && comment.toxicityScore > 0.5 && (
                  <div className="mt-2 text-xs text-orange-600">
                    ⚠️ This comment has been reviewed for harmful content
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

