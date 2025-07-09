import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiVideo, FiPlus, FiUsers, FiClock, FiCalendar } from 'react-icons/fi';
import { Button, Card, Badge, Modal } from '../components/ui';
import api from '../services/api';
import toast from 'react-hot-toast';
import InstantMeetingModal from './CreateMeeting';

const Dashboard = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [meetings, setMeetings] = useState([]);
  const [loadingMeetings, setLoadingMeetings] = useState(true);
  const navigate = useNavigate();

  // Fetch user's meetings
  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        const response = await api.get('/meetings');
        setMeetings(response.data.meetings);
      } catch (error) {
        console.error('Failed to fetch meetings:', error);
        toast.error('Failed to load meetings');
      } finally {
        setLoadingMeetings(false);
      }
    };

    fetchMeetings();
  }, []);

  // Filter meetings
  const upcomingMeetings = meetings.filter(meeting => {
    const meetingDate = new Date(meeting.start_time);
    const now = new Date();
    return meetingDate > now;
  }).slice(0, 3);

  const recentMeetings = meetings.filter(meeting => {
    const meetingDate = new Date(meeting.start_time);
    const now = new Date();
    return meetingDate <= now;
  }).slice(0, 3);

  const stats = [
    { label: 'Total Meetings', value: meetings.length.toString(), icon: FiVideo, color: 'text-blue-600' },
    { label: 'This Month', value: meetings.filter(m => {
      const meetingDate = new Date(m.start_time);
      const now = new Date();
      return meetingDate.getMonth() === now.getMonth() && meetingDate.getFullYear() === now.getFullYear();
    }).length.toString(), icon: FiCalendar, color: 'text-green-600' },
    { label: 'Upcoming', value: upcomingMeetings.length.toString(), icon: FiUsers, color: 'text-purple-600' },
    { label: 'Completed', value: recentMeetings.length.toString(), icon: FiClock, color: 'text-orange-600' },
  ];

  const handleCreateMeeting = () => {
    navigate('/create-meeting');
  };

  const handleQuickStart = () => {
    setIsLoading(true);
    // Simulate loading
    setTimeout(() => {
      setIsLoading(false);
      // Navigate to meeting
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Welcome back! Here's what's happening with your meetings.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <Button
            variant="outline"
            leftIcon={<FiPlus />}
            onClick={() => setIsModalOpen(true)}
          >
            Create Meeting
          </Button>
          <Button
            variant="primary"
            leftIcon={<FiVideo />}
            onClick={handleQuickStart}
            loading={isLoading}
          >
            Quick Start
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="p-6" hover>
              <div className="flex items-center">
                <div className={`p-3 rounded-lg bg-gray-100 ${stat.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Meetings */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Meetings</h2>
            <Link
              to="/create-meeting"
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              View all
            </Link>
          </div>
          <div className="space-y-4">
            {loadingMeetings ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Loading meetings...</p>
              </div>
            ) : upcomingMeetings.length > 0 ? (
              upcomingMeetings.map((meeting) => {
                const meetingDate = new Date(meeting.start_time);
                const formattedDate = meetingDate.toLocaleDateString();
                const formattedTime = meetingDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                return (
                  <div
                    key={meeting.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => navigate(`/meeting/${meeting.id}`)}
                  >
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{meeting.title}</h3>
                      <p className="text-sm text-gray-600">
                        {formattedDate} at {formattedTime}
                      </p>
                      <p className="text-sm text-gray-500">
                        Duration: {meeting.duration} minutes
                      </p>
                    </div>
                    <Badge variant="primary">Upcoming</Badge>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500">No upcoming meetings</p>
              </div>
            )}
          </div>
        </Card>

        {/* Recent Meetings */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Meetings</h2>
            <Link
              to="/meetings"
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              View all
            </Link>
          </div>
          <div className="space-y-4">
            {loadingMeetings ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Loading meetings...</p>
              </div>
            ) : recentMeetings.length > 0 ? (
              recentMeetings.map((meeting) => {
                const meetingDate = new Date(meeting.start_time);
                const formattedDate = meetingDate.toLocaleDateString();
                const formattedTime = meetingDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                return (
                  <div
                    key={meeting.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => navigate(`/meeting/${meeting.id}`)}
                  >
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{meeting.title}</h3>
                      <p className="text-sm text-gray-600">
                        {formattedDate} at {formattedTime}
                      </p>
                      <p className="text-sm text-gray-500">
                        Duration: {meeting.duration} minutes
                      </p>
                    </div>
                    <Badge variant="success">Completed</Badge>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500">No recent meetings</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button
            variant="outline"
            fullWidth
            leftIcon={<FiPlus />}
            onClick={() => setIsModalOpen(true)}
          >
            Schedule Meeting
          </Button>
          <Button
            variant="outline"
            fullWidth
            leftIcon={<FiVideo />}
            onClick={() => navigate('/join-meeting')}
          >
            Join Meeting
          </Button>
          <Button
            variant="outline"
            fullWidth
            leftIcon={<FiUsers />}
            onClick={() => navigate('/create-meeting')}
          >
            Create Meeting
          </Button>
          <Button
            variant="outline"
            fullWidth
            leftIcon={<FiCalendar />}
            onClick={() => navigate('/dashboard')}
          >
            View All
          </Button>
        </div>
      </Card>

      <InstantMeetingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onJoin={meetingId => navigate(`/meeting/${meetingId}`)}
      />
    </div>
  );
};

export default Dashboard; 