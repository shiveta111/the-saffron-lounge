// Status page to verify deployment
export default function StatusPage() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1>Deployment Successful!</h1>
      <p>Your Next.js application is running correctly.</p>
      <div style={{ 
        backgroundColor: '#f0f0f0', 
        padding: '1rem', 
        borderRadius: '4px',
        marginTop: '1rem'
      }}>
        <p><strong>Environment:</strong> {process.env.NODE_ENV || 'development'}</p>
        <p><strong>Timestamp:</strong> {new Date().toLocaleString()}</p>
      </div>
    </div>
  );
}