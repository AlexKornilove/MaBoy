import React from 'react';

const BulkDuplicateResolutionModal = ({ duplicates, onResolve }) => {
    return (
        <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: '600px' }}>
                <div className="modal-header">
                    <h2>Обнаружены дубликаты</h2>
                </div>
                <div style={{ marginBottom: '20px' }}>
                    <p>При добавлении файлов обнаружены совпадения имен со следующими предметами:</p>
                    <ul style={{
                        maxHeight: '200px',
                        overflowY: 'auto',
                        background: 'rgba(0,0,0,0.2)',
                        padding: '10px',
                        borderRadius: '4px',
                        listStyle: 'none'
                    }}>
                        {duplicates.map((item, index) => (
                            <li key={index} style={{ padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                Item: <strong>{item.name}</strong>
                            </li>
                        ))}
                    </ul>
                    <p>Как вы хотите поступить?</p>
                </div>
                <div className="form-actions" style={{ flexDirection: 'column', gap: '10px' }}>
                    <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => onResolve('all')}>
                        Добавить всё (создать дубликаты)
                    </button>
                    <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => onResolve('unique')}>
                        Пропустить дубликаты (добавить только новые)
                    </button>
                    <button className="btn btn-danger" style={{ width: '100%' }} onClick={() => onResolve('cancel')}>
                        Отмена (ничего не добавлять)
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BulkDuplicateResolutionModal;
