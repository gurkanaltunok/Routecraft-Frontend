'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { travelPlansApi, TravelPlanDto } from '@/lib/api/travelPlans';
import { useToast } from '@/contexts/ToastContext';
import Header from '@/app/components/Header';
import AdminSidebar from '@/app/components/AdminSidebar';
import DeleteConfirmationModal from '@/app/components/DeleteConfirmationModal';

export default function AdminRoutesPage() {
  const { isAuthenticated, isLoading: authLoading, isAdmin } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [routes, setRoutes] = useState<TravelPlanDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<number | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [routeToDelete, setRouteToDelete] = useState<TravelPlanDto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated || !isAdmin) {
      router.push('/login');
      return;
    }

    loadRoutes();
  }, [isAuthenticated, authLoading, isAdmin, router, typeFilter, difficultyFilter]);

  const loadRoutes = async () => {
    try {
      setIsLoading(true);
      setError(null);
      let routesData: TravelPlanDto[];
      
      if (typeFilter !== null) {
        routesData = await travelPlansApi.getByType(typeFilter, searchQuery || undefined);
      } else {
        routesData = await travelPlansApi.getAll();
      }

      // Apply difficulty filter if set
      if (difficultyFilter !== null) {
        routesData = routesData.filter(route => route.difficulty === difficultyFilter);
      }

      // Apply search filter if set (client-side for better UX)
      if (searchQuery && typeFilter === null) {
        routesData = routesData.filter(route =>
          route.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          route.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      setRoutes(routesData);
    } catch (err: any) {
      console.error('Error loading routes:', err);
      if (err.status === 403 || err.status === 401) {
        setError('You do not have permission to access this page.');
      } else {
        setError('Failed to load routes. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadRoutes();
  };

  const getTypeLabel = (type: number) => {
    switch (type) {
      case 1:
        return 'Trip';
      case 2:
        return 'Hiking';
      default:
        return 'Unknown';
    }
  };

  const getTypeColor = (type: number) => {
    switch (type) {
      case 1:
        return 'bg-blue-100 text-blue-800';
      case 2:
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyLabel = (difficulty: number) => {
    switch (difficulty) {
      case 1:
        return 'Easy';
      case 2:
        return 'Medium';
      case 3:
        return 'Hard';
      default:
        return 'Unknown';
    }
  };

  const getDifficultyColor = (difficulty: number) => {
    switch (difficulty) {
      case 1:
        return 'bg-green-100 text-green-800';
      case 2:
        return 'bg-yellow-100 text-yellow-800';
      case 3:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDistance = (meters: number | null) => {
    if (!meters) return 'N/A';
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(2)}km`;
  };

  const formatElevation = (meters: number | null) => {
    if (!meters) return 'N/A';
    return `${Math.round(meters)}m`;
  };

  const handleDeleteClick = (route: TravelPlanDto) => {
    setRouteToDelete(route);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!routeToDelete) return;

    try {
      setIsDeleting(true);
      await travelPlansApi.delete(routeToDelete.travelPlanID);
      setRoutes(routes.filter(r => r.travelPlanID !== routeToDelete.travelPlanID));
      showToast('Route deleted successfully', 'success');
      setDeleteModalOpen(false);
      setRouteToDelete(null);
    } catch (err: any) {
      console.error('Error deleting route:', err);
      showToast(err.message || 'Failed to delete route', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
        <Header onSearch={() => {}} />
        <div className="admin-layout">
          <AdminSidebar />
          <div className="admin-content flex items-center justify-center">
            <div className="admin-spinner"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
        <Header onSearch={() => {}} />
        <div className="admin-layout">
          <AdminSidebar />
          <div className="admin-content flex items-center justify-center">
            <div className="admin-card p-8 max-w-md text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Access Error</h3>
              <p className="text-gray-600 mb-6">{error}</p>
              <button
                onClick={() => router.push('/admin')}
                className="admin-btn admin-btn-primary"
              >
                Back to Admin Panel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
      <Header onSearch={() => {}} />
      
      <div className="admin-layout">
        <AdminSidebar />
        
        <main className="admin-content">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
            {/* Page Header */}
            <div className="admin-page-header">
              <h1 className="admin-page-title">Route Control</h1>
              <p className="admin-page-subtitle">View and manage travel routes</p>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
              <div className="admin-stat-card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="admin-stat-label">Total Routes</p>
                    <p className="admin-stat-value text-[#1C4633]">{routes.length}</p>
                    <p className="admin-stat-sublabel">All published routes</p>
                  </div>
                  <div className="admin-stat-icon bg-emerald-50">
                    <svg className="w-7 h-7 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="admin-stat-card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="admin-stat-label">Trips</p>
                    <p className="admin-stat-value text-blue-600">
                      {routes.filter(r => r.type === 1).length}
                    </p>
                    <p className="admin-stat-sublabel">City & travel routes</p>
                  </div>
                  <div className="admin-stat-icon bg-blue-50">
                    <svg className="w-7 h-7 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="admin-stat-card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="admin-stat-label">Hiking Routes</p>
                    <p className="admin-stat-value text-emerald-600">
                      {routes.filter(r => r.type === 2).length}
                    </p>
                    <p className="admin-stat-sublabel">Nature & trails</p>
                  </div>
                  <div className="admin-stat-icon bg-emerald-50">
                    <svg className="w-7 h-7 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="admin-stat-card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="admin-stat-label">Total Ratings</p>
                    <p className="admin-stat-value text-amber-600">
                      {routes.reduce((sum, route) => sum + route.totalRatings, 0)}
                    </p>
                    <p className="admin-stat-sublabel">User reviews</p>
                  </div>
                  <div className="admin-stat-icon bg-amber-50">
                    <svg className="w-7 h-7 text-amber-500" viewBox="0 0 24 24" fill="currentColor">
                      <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="admin-card p-5 mb-6">
              <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
                <div className="relative flex-1 min-w-[200px]">
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search routes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="admin-search-input"
                  />
                </div>
                <select
                  value={typeFilter === null ? 'all' : typeFilter.toString()}
                  onChange={(e) => setTypeFilter(e.target.value === 'all' ? null : parseInt(e.target.value))}
                  className="admin-select"
                >
                  <option value="all">All Types</option>
                  <option value="1">Trips</option>
                  <option value="2">Hiking</option>
                </select>
                <select
                  value={difficultyFilter === null ? 'all' : difficultyFilter.toString()}
                  onChange={(e) => setDifficultyFilter(e.target.value === 'all' ? null : parseInt(e.target.value))}
                  className="admin-select"
                >
                  <option value="all">All Difficulties</option>
                  <option value="1">Easy</option>
                  <option value="2">Medium</option>
                  <option value="3">Hard</option>
                </select>
                <button type="submit" className="admin-btn admin-btn-primary">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                  Search
                </button>
                {(typeFilter !== null || difficultyFilter !== null || searchQuery) && (
                  <button
                    type="button"
                    onClick={() => {
                      setTypeFilter(null);
                      setDifficultyFilter(null);
                      setSearchQuery('');
                      loadRoutes();
                    }}
                    className="admin-btn admin-btn-ghost"
                  >
                    Clear
                  </button>
                )}
              </form>
            </div>

            {/* Routes Table */}
            <div className="admin-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="admin-table">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Route
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Difficulty
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Creator
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statistics
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Distance / Elevation
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {routes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No routes found
                    </td>
                  </tr>
                ) : (
                  routes.map((route) => (
                    <tr key={route.travelPlanID} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{route.title}</div>
                          <div className="text-sm text-gray-500 line-clamp-2">{route.description}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getTypeColor(route.type)}`}>
                          {getTypeLabel(route.type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getDifficultyColor(route.difficulty)}`}>
                          {getDifficultyLabel(route.difficulty)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{route.creatorName || 'Unknown'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1">
                            <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            <span>{route.averageRating.toFixed(1)} ({route.totalRatings})</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex flex-col gap-1">
                          <div>{formatDistance(route.totalDistanceInMeters)}</div>
                          <div>{formatElevation(route.totalElevationGainInMeters)}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleDeleteClick(route)}
                          className="text-red-600 hover:text-red-800 transition-colors font-medium flex items-center gap-2 ml-auto"
                          disabled={isDeleting}
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
              </div>
            </div>
          </div>
        </main>
      </div>

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setRouteToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Route"
        message="Are you sure you want to delete this route? This action cannot be undone."
        itemName={routeToDelete?.title}
      />
    </div>
  );
}
