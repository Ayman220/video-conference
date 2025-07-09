import React from 'react';
import { Button, Card, Input } from '../components/ui';
import { FiUser, FiMail, FiSave } from 'react-icons/fi';

const Profile = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
      
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
        <div className="space-y-4">
          <Input
            label="Username"
            placeholder="Enter your username"
            leftIcon={<FiUser />}
          />
          <Input
            label="Email"
            type="email"
            placeholder="Enter your email"
            leftIcon={<FiMail />}
          />
          <Button leftIcon={<FiSave />}>
            Save Changes
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Profile; 