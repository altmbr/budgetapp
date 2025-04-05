import React, { useState, useCallback } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import axios from 'axios';

const PlaidLink = ({ onSuccess }) => {
  const [linkToken, setLinkToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Generate a link token when the component mounts
  const generateToken = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.post('/api/create_link_token');
      setLinkToken(response.data.link_token);
      setLoading(false);
    } catch (err) {
      setError('Failed to generate link token');
      setLoading(false);
    }
  }, []);

  // Exchange the public token for an access token
  const handleOnSuccess = useCallback(async (public_token, metadata) => {
    try {
      await axios.post('/api/exchange_public_token', { public_token });
      onSuccess();
    } catch (err) {
      setError('Failed to exchange token');
    }
  }, [onSuccess]);

  // Configure the Plaid Link
  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: handleOnSuccess,
    onExit: (err, metadata) => {
      if (err) setError('Link exited with error');
    },
  });

  // Initialize the link token on first render
  React.useEffect(() => {
    if (!linkToken) {
      generateToken();
    }
  }, [linkToken, generateToken]);

  return (
    <div className="plaid-link-container">
      {error && <div className="alert alert-danger">{error}</div>}
      <button
        onClick={() => open()}
        disabled={!ready || !linkToken || loading}
        className="btn btn-primary btn-lg"
      >
        {loading ? 'Loading...' : 'Connect Bank Account'}
      </button>
    </div>
  );
};

export default PlaidLink;
