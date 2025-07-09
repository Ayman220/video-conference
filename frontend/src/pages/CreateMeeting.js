import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '../components/ui';
import { FiVideo, FiLink } from 'react-icons/fi';
import api from '../services/api';
import toast from 'react-hot-toast';

const InstantMeetingModal = ({ isOpen, onClose, onJoin }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [createdMeeting, setCreatedMeeting] = useState(null);

  const createInstantMeeting = async () => {
    setIsLoading(true);
    try {
      const now = new Date();
      const startTime = now.toISOString();
      const meetingData = {
        title: 'Instant Meeting',
        description: '',
        startTime: startTime,
        duration: 60,
        maxParticipants: 100,
      };
      const response = await api.post('/meetings', meetingData);
      const meeting = response.data.meeting;
      setCreatedMeeting(meeting);
      toast.success('Meeting created!');
    } catch (error) {
      console.error('Create meeting error:', error);
      toast.error(error.response?.data?.error || 'Failed to create meeting');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinMeeting = () => {
    if (createdMeeting && onJoin) {
      onJoin(createdMeeting.id);
    }
  };

  const handleCopyLink = async () => {
    if (createdMeeting) {
      const meetingUrl = `${window.location.origin}/join/${createdMeeting.meetingLink || createdMeeting.meeting_link || createdMeeting.id}`;
      try {
        await navigator.clipboard.writeText(meetingUrl);
        toast.success('Meeting link copied to clipboard!');
      } catch (error) {
        toast.error('Failed to copy link');
      }
    }
  };

  React.useEffect(() => {
    if (isOpen && !createdMeeting && !isLoading) {
      createInstantMeeting();
    }
    // eslint-disable-next-line
  }, [isOpen]);

  if (!isOpen) return null;

  const meetingUrl = createdMeeting
    ? `${window.location.origin}/join/${createdMeeting.meetingLink}`
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <Card className="max-w-lg w-full mx-auto p-8 text-center relative">
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
          onClick={onClose}
        >
          &times;
        </button>
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-2">
            <FiVideo className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Meeting is Ready</h2>
          <p className="text-gray-600 mb-4">Share this link to invite others or join now.</p>
          {createdMeeting && (
            <>
              <div className="bg-gray-50 rounded-lg p-4 w-full">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Meeting Link:</span>
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<FiLink />}
                    onClick={handleCopyLink}
                  >
                    Copy Link
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1 break-all">
                  {meetingUrl}
                </p>
              </div>
              <Button
                variant="primary"
                size="lg"
                className="mt-6 w-full"
                onClick={handleJoinMeeting}
                loading={isLoading}
              >
                Join Now
              </Button>
            </>
          )}
          {!createdMeeting && (
            <Button variant="primary" size="lg" loading={isLoading} disabled>
              Creating Meeting...
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default InstantMeetingModal; 