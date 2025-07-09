import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Button, Card, Input } from '../components/ui';
import { FiVideo, FiKey, FiUser } from 'react-icons/fi';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';

const JoinMeeting = () => {
  const { meetingLink } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [meeting, setMeeting] = useState(null);
  const { isAuthenticated } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  // If meeting link is provided in URL, fetch meeting details
  useEffect(() => {
    if (meetingLink) {
      fetchMeetingByLink();
    }
  }, [meetingLink]);

  const fetchMeetingByLink = async () => {
    try {
      console.log('Fetching meeting by link:', meetingLink);
      
      // Only try to fetch if it looks like a meeting link (UUID format)
      // Meeting links are UUIDs, while meeting IDs are numbers
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(meetingLink);
      
      console.log('Is UUID format:', isUUID);
      
      if (isUUID) {
        console.log('Making API call to /meetings/link/', meetingLink);
        const response = await api.get(`/meetings/link/${meetingLink}`);
        console.log('Meeting fetched successfully:', response.data);
        setMeeting(response.data.meeting);
      } else {
        // If it's not a UUID, it might be a meeting ID, so we'll handle it in onSubmit
        console.log('Not a meeting link format, will handle as meeting ID');
      }
    } catch (error) {
      console.error('Failed to fetch meeting:', error);
      console.error('Error response:', error.response?.data);
      // Don't show error toast here as it might be a meeting ID instead of a link
    }
  };

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      let meetingId = data.meetingId;
      
      // If no meeting ID provided but we have meeting from link
      if (!meetingId && meeting) {
        meetingId = meeting.id;
      }

      if (!meetingId) {
        toast.error('Please provide a meeting ID');
        return;
      }

      console.log('Joining meeting:', { meetingId, isAuthenticated, meeting });

      // If joining via meeting link, always treat as guest join
      // This allows anyone with the link to join, regardless of authentication
      if (meetingLink || !isAuthenticated) {
        console.log('Joining via meeting link or not authenticated, navigating as guest');
        navigate(`/meeting/${meetingId}?guest=true&name=${encodeURIComponent(data.name)}`);
        return;
      }

      // For authenticated users joining by meeting ID (not link), try to join the meeting
      try {
        console.log('User authenticated, trying to join meeting via API');
        await api.post(`/meetings/join-id/${meetingId}`);
        navigate(`/meeting/${meetingId}`);
      } catch (error) {
        // If join fails, still navigate to meeting (might be a guest meeting)
        console.warn('Join meeting failed, proceeding as guest:', error);
        navigate(`/meeting/${meetingId}?guest=true&name=${encodeURIComponent(data.name)}`);
      }
    } catch (error) {
      console.error('Join meeting error:', error);
      toast.error('Failed to join meeting');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <FiVideo className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Join Meeting
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {meeting ? `Join "${meeting.title}"` : 'Enter meeting details to join'}
          </p>
          {!isAuthenticated && (
            <p className="mt-1 text-xs text-orange-600">
              You'll join as a guest
            </p>
          )}
        </div>

        <Card className="p-8">
          {meeting && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900">{meeting.title}</h3>
              <p className="text-sm text-blue-700 mt-1">
                {new Date(meeting.start_time).toLocaleString()}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {!meeting && (
              <Input
                label="Meeting ID"
                placeholder="Enter meeting ID"
                leftIcon={<FiVideo />}
                error={errors.meetingId?.message}
                {...register('meetingId', {
                  required: !meeting ? 'Meeting ID is required' : false,
                })}
              />
            )}

            <Input
              label="Your Name"
              placeholder="Enter your name"
              leftIcon={<FiUser />}
              error={errors.name?.message}
              {...register('name', {
                required: 'Your name is required',
                minLength: {
                  value: 2,
                  message: 'Name must be at least 2 characters',
                },
              })}
            />

            <Input
              label="Password (optional)"
              type="password"
              placeholder="Enter meeting password"
              leftIcon={<FiKey />}
              error={errors.password?.message}
              {...register('password')}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={isLoading}
            >
              Join Meeting
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have a meeting?{' '}
              <button
                onClick={() => navigate('/create-meeting')}
                className="font-medium text-blue-600 hover:text-blue-500 transition-colors duration-200"
              >
                Create one
              </button>
            </p>
            {!isAuthenticated && (
              <p className="mt-2 text-sm text-gray-600">
                Already have an account?{' '}
                <button
                  onClick={() => navigate('/login')}
                  className="font-medium text-blue-600 hover:text-blue-500 transition-colors duration-200"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default JoinMeeting; 