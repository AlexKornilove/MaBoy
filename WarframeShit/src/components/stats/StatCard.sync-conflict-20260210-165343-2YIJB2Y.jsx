import React from 'react';

const StatCard = ({ title, stats, onClick }) => {
    const { collected, mastered, total } = stats;

    const collectedPercent = total > 0 ? Math.round((collected / total) * 100) : 0;
    const masteredPercent = total > 0 ? Math.round((mastered / total) * 100) : 0;

    return (
        <div
            className="stat-card"
            style={{
                textAlign: 'left',
                cursor: onClick ? 'pointer' : 'default',
                transition: 'transform 0.2s, box-shadow 0.2s'
            }}
            onClick={onClick}
        >
            <h3 style={{ textAlign: 'center', marginBottom: '15px' }}>{title}</h3>

            {/* Collected Progress */}
            <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 'bold', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--wf-primary)' }}>Собрано</span>
                    <span style={{ color: 'var(--wf-text)' }}>{collected} / {total} ({collectedPercent}%)</span>
                </div>
                <div className="progress-bar" style={{ height: '10px', background: 'rgba(0,0,0,0.5)' }}>
                    <div className="progress-fill" style={{
                        width: `${collectedPercent}%`,
                        background: 'linear-gradient(90deg, var(--wf-primary) 0%, var(--wf-secondary) 100%)'
                    }}></div>
                </div>
            </div>

            {/* Mastered Progress */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 'bold', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--wf-success)' }}>Освоено</span>
                    <span style={{ color: 'var(--wf-text)' }}>{mastered} / {total} ({masteredPercent}%)</span>
                </div>
                <div className="progress-bar" style={{ height: '10px', background: 'rgba(0,0,0,0.5)' }}>
                    <div className="progress-fill" style={{
                        width: `${masteredPercent}%`,
                        background: 'var(--wf-success)'
                    }}></div>
                </div>
            </div>
        </div>
    );
};

export default StatCard;
