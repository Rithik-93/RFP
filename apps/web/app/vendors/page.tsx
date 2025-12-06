'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getVendors, createVendor } from '@/lib/api';

export default function VendorsPage() {
    const router = useRouter();
    const [vendors, setVendors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        company: '',
        specialties: '',
    });

    useEffect(() => {
        loadVendors();
    }, []);

    const loadVendors = async () => {
        try {
            const data = await getVendors();
            setVendors(data);
        } catch (error) {
            console.error('Failed to load vendors:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createVendor({
                ...formData,
                specialties: formData.specialties.split(',').map(s => s.trim()).filter(Boolean),
            });
            setShowForm(false);
            setFormData({ name: '', email: '', phone: '', company: '', specialties: '' });
            loadVendors();
        } catch (error) {
            alert('Failed to create vendor');
        }
    };

    if (loading) {
        return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;
    }

    return (
        <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h1 style={{ fontSize: '2rem' }}>Vendors</h1>
                <button
                    onClick={() => setShowForm(!showForm)}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#0070f3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                    }}
                >
                    {showForm ? 'Cancel' : '+ Add Vendor'}
                </button>
            </div>

            {showForm && (
                <div style={{
                    padding: '25px',
                    backgroundColor: '#f9f9f9',
                    borderRadius: '10px',
                    marginBottom: '30px'
                }}>
                    <h2 style={{ marginBottom: '20px' }}>Add New Vendor</h2>
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                            <input
                                type="text"
                                placeholder="Contact Name *"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                            />
                            <input
                                type="email"
                                placeholder="Email *"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                            />
                            <input
                                type="text"
                                placeholder="Phone"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                            />
                            <input
                                type="text"
                                placeholder="Company Name *"
                                value={formData.company}
                                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                required
                                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                            />
                        </div>
                        <input
                            type="text"
                            placeholder="Specialties (comma-separated, e.g., IT Equipment, Office Supplies)"
                            value={formData.specialties}
                            onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '10px',
                                borderRadius: '6px',
                                border: '1px solid #ddd',
                                marginBottom: '15px'
                            }}
                        />
                        <button
                            type="submit"
                            style={{
                                padding: '10px 20px',
                                backgroundColor: '#0070f3',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                            }}
                        >
                            Add Vendor
                        </button>
                    </form>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {vendors.map((vendor) => (
                    <div
                        key={vendor.id}
                        style={{
                            padding: '20px',
                            border: '2px solid #e0e0e0',
                            borderRadius: '10px',
                        }}
                    >
                        <h3 style={{ fontSize: '1.2rem', marginBottom: '10px' }}>{vendor.name}</h3>
                        <p style={{ color: '#666', marginBottom: '5px' }}><strong>Company:</strong> {vendor.company}</p>
                        <p style={{ color: '#666', marginBottom: '5px' }}><strong>Email:</strong> {vendor.email}</p>
                        {vendor.phone && <p style={{ color: '#666', marginBottom: '5px' }}><strong>Phone:</strong> {vendor.phone}</p>}
                        {vendor.specialties && vendor.specialties.length > 0 && (
                            <div style={{ marginTop: '10px' }}>
                                {vendor.specialties.map((spec: string, i: number) => (
                                    <span
                                        key={i}
                                        style={{
                                            display: 'inline-block',
                                            padding: '4px 10px',
                                            backgroundColor: '#e0f2fe',
                                            borderRadius: '12px',
                                            fontSize: '0.85rem',
                                            marginRight: '5px',
                                            marginBottom: '5px',
                                        }}
                                    >
                                        {spec}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {vendors.length === 0 && !showForm && (
                <div style={{ textAlign: 'center', padding: '60px', color: '#666' }}>
                    <p style={{ fontSize: '1.2rem', marginBottom: '20px' }}>No vendors yet</p>
                    <button
                        onClick={() => setShowForm(true)}
                        style={{
                            padding: '12px 24px',
                            backgroundColor: '#0070f3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '1rem',
                        }}
                    >
                        Add Your First Vendor
                    </button>
                </div>
            )}
        </div>
    );
}
