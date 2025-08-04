import React, { useState, useEffect } from 'react';
import { PeraWalletConnect } from "@perawallet/connect";
import algosdk from 'algosdk';
import './App.css';

// Create the PeraWalletConnect instance
const peraWallet = new PeraWalletConnect();

// Algorand configuration (using TestNet)
const ALGOD_SERVER = "https://testnet-api.algonode.cloud";
const ALGOD_PORT = "443";
const ALGOD_TOKEN = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

// Initialize Algorand client
const algodClient = new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, ALGOD_PORT);

// Simple request interface
interface AlgoRequest {
  id: string;
  requesterAddress: string;
  requesterName: string;
  amount: number;
  reason: string;
  timestamp: Date;
  fulfilled: boolean;
  fulfilledBy?: string;
}

function App() {
  const [accountAddress, setAccountAddress] = useState<string | null>(null);
  const isConnectedToPeraWallet = !!accountAddress;
  
  // Simple sample requests
  const [requests, setRequests] = useState<AlgoRequest[]>([
    {
      id: '1',
      requesterAddress: 'RMXPY4HZ5473LLUVM5SKAI72W4WI6PJRGAKL43MVIZLU5ILWX2MEW4LHJY',
      requesterName: 'SavvySid',
      amount: 1,
      reason: 'Need some ALGOs for testing my dApp',
      timestamp: new Date(Date.now() - 3600000), // 1 hour ago
      fulfilled: false
    },
    {
      id: '2',
      requesterAddress: 'GD64YIY3TWGDMCNPP553DZPPR6LDUSFQOIJVFDPPXWEG3FVOJCCDBBHU5A',
      requesterName: 'Bob',
      amount: 0.05,
      reason: 'Learning Algorand',
      timestamp: new Date(Date.now() - 7200000),
      fulfilled: false
    }
  ]);
  
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [newRequest, setNewRequest] = useState({
    amount: '',
    reason: '',
    name: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    peraWallet.reconnectSession().then((accounts) => {
      if (peraWallet.isConnected && accounts.length) {
        setAccountAddress(accounts[0]);
      }
    });
  }, []);

  function handleConnectWalletClick() {
    peraWallet
      .connect()
      .then((newAccounts) => {
        // Setup the disconnect event listener
        peraWallet.connector?.on("disconnect", handleDisconnectWalletClick);

        console.log('Connected to wallet:', newAccounts[0]);
        setAccountAddress(newAccounts[0]);
      })
      .catch((error) => {
        if (error?.data?.type !== "CONNECT_MODAL_CLOSED") {
          alert("Connection failed. Please try again.");
        }
      });
  }

  function handleDisconnectWalletClick() {
    peraWallet.disconnect();
    setAccountAddress(null);
  }

  function handleCreateRequest() {
    if (!accountAddress || !newRequest.amount || !newRequest.reason || !newRequest.name) {
      alert('Please fill in all fields');
      return;
    }

    const request: AlgoRequest = {
      id: Date.now().toString(),
      requesterAddress: accountAddress,
      requesterName: newRequest.name,
      amount: parseFloat(newRequest.amount),
      reason: newRequest.reason,
      timestamp: new Date(),
      fulfilled: false
    };

    setRequests([request, ...requests]);
    setNewRequest({ amount: '', reason: '', name: '' });
    setShowRequestForm(false);
  }

  async function handleSendAlgo(request: AlgoRequest) {
    if (!accountAddress) {
      alert('Please connect your wallet first');
      return;
    }

    setIsLoading(true);

    try {
      // Get suggested parameters for the transaction
      const suggestedParams = await algodClient.getTransactionParams().do();
      
      // Convert ALGO amount to microALGOs (1 ALGO = 1,000,000 microALGOs)
      const amountInMicroAlgos = Math.round(request.amount * 1000000);
      
      // Create payment transaction
      const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: accountAddress,
        receiver: request.requesterAddress,
        amount: amountInMicroAlgos,
        suggestedParams
      });

      // Sign transaction
      const txnToSign = [{ txn, signers: [accountAddress] }];
      const signedTxn = await peraWallet.signTransaction([txnToSign]);
      
      // Send transaction
      const response = await algodClient.sendRawTransaction(signedTxn).do();
      const txId = response.txid;
      
      console.log('Transaction sent successfully! Transaction ID:', txId);
      
      // Update the request as fulfilled
      const updatedRequests = requests.map(req => 
        req.id === request.id 
          ? { ...req, fulfilled: true, fulfilledBy: accountAddress }
          : req
      );
      setRequests(updatedRequests);
      
      if (txId) {
        alert(`Successfully sent ${request.amount} ALGOs to ${request.requesterName}! Transaction ID: ${txId}`);
      } else {
        alert(`Successfully sent ${request.amount} ALGOs to ${request.requesterName}! Transaction submitted successfully.`);
      }
    } catch (error: any) {
      alert(`Failed to send ALGOs: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }

  function formatAddress(address: string) {
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  }

  function formatTimeAgo(date: Date) {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return `${Math.floor(diffInMinutes / 1440)} days ago`;
  }

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-card">
          <h1>ALGO Marketplace</h1>
          <p className="subtitle">Request and send ALGOs on Algorand</p>
          
          <button
            className="connect-button"
            onClick={
              isConnectedToPeraWallet ? handleDisconnectWalletClick : handleConnectWalletClick
            }
          >
            {isConnectedToPeraWallet ? "Disconnect" : "Connect to Pera Wallet"}
          </button>

          {accountAddress && (
            <div className="account-info">
              <h3>Connected Account:</h3>
              <p>{formatAddress(accountAddress)}</p>
            </div>
          )}
        </div>
      </header>

      {/* Only show marketplace if wallet is connected */}
      {isConnectedToPeraWallet ? (
        <main className="marketplace">
          <div className="request-section">
            <div className="section-header">
              <h2>Create a Request</h2>
              <button 
                className="create-request-btn"
                onClick={() => setShowRequestForm(!showRequestForm)}
              >
                {showRequestForm ? 'Cancel' : 'Request ALGOs'}
              </button>
            </div>

            {showRequestForm && (
              <div className="request-form">
                <div className="form-group">
                  <label>Your Name:</label>
                  <input
                    type="text"
                    value={newRequest.name}
                    onChange={(e) => setNewRequest({...newRequest, name: e.target.value})}
                    placeholder="Enter your name"
                  />
                </div>
                <div className="form-group">
                  <label>Amount (ALGOs):</label>
                  <input
                    type="number"
                    step="0.001"
                    value={newRequest.amount}
                    onChange={(e) => setNewRequest({...newRequest, amount: e.target.value})}
                    placeholder="0.1"
                  />
                </div>
                <div className="form-group">
                  <label>Reason:</label>
                  <textarea
                    value={newRequest.reason}
                    onChange={(e) => setNewRequest({...newRequest, reason: e.target.value})}
                    placeholder="Why do you need ALGOs?"
                    rows={3}
                  />
                </div>
                <button 
                  className="submit-request-btn"
                  onClick={handleCreateRequest}
                >
                  Submit Request
                </button>
              </div>
            )}
          </div>

          <div className="marketplace-section">
            <h2>ALGO Requests</h2>
            <div className="requests-grid">
              {requests.map((request) => (
                <div key={request.id} className={`request-card ${request.fulfilled ? 'fulfilled' : ''}`}>
                  <div className="request-header">
                    <h3>{request.requesterName}</h3>
                    <span className={`status ${request.fulfilled ? 'fulfilled' : 'pending'}`}>
                      {request.fulfilled ? 'Fulfilled' : 'Pending'}
                    </span>
                  </div>
                  
                  <div className="request-details">
                    <p className="amount">{request.amount} ALGOs</p>
                    <p className="reason">{request.reason}</p>
                    <p className="address">From: {formatAddress(request.requesterAddress)}</p>
                    <p className="timestamp">{formatTimeAgo(request.timestamp)}</p>
                  </div>

                  {!request.fulfilled && isConnectedToPeraWallet && accountAddress !== request.requesterAddress && (
                    <button 
                      className={`send-algo-btn ${isLoading ? 'loading' : ''}`}
                      onClick={() => handleSendAlgo(request)}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Processing...' : `Send ${request.amount} ALGOs`}
                    </button>
                  )}

                  {request.fulfilled && request.fulfilledBy && (
                    <p className="fulfilled-by">
                      Fulfilled by: {formatAddress(request.fulfilledBy)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </main>
      ) : (
        <div className="welcome-section">
          <div className="welcome-card">
            <h2>Welcome to ALGO Marketplace</h2>
            <p>Connect your Pera Wallet to start requesting and sending ALGOs on the Algorand network.</p>
            <div className="features">
              <div className="feature">
                <span className="feature-icon">💰</span>
                <h3>Request ALGOs</h3>
                <p>Create requests for ALGOs and let others help you</p>
              </div>
              <div className="feature">
                <span className="feature-icon">🎁</span>
                <h3>Send ALGOs</h3>
                <p>Browse requests and send ALGOs to help others</p>
              </div>
              <div className="feature">
                <span className="feature-icon">🔗</span>
                <h3>Algorand Network</h3>
                <p>Built on Algorand for fast and secure transactions</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
