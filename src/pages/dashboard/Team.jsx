import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { FaEnvelope, FaIdBadge } from 'react-icons/fa';

const teamData = [
  { name: 'Madhu',   branch: 'CSE', roll: '22A51A05F5', email: 'madhukorada23@gmail.com',   img: process.env.PUBLIC_URL + '/madhu.jpg' },
  { name: 'Mahesh',  branch: 'CSE', roll: '22A51A05F4', email: 'mahesh20104@gmail.com',     img: process.env.PUBLIC_URL + '/blazzerpic1.jpg' },
  { name: 'Jagadeesh', branch: 'CSE', roll: '22A51A05D9', email: 'dasarijagadeesh442@gmail.com', img: process.env.PUBLIC_URL + '/jagga.jpg' },
  { name: 'Bharath', branch: 'CSE', roll: '22A51A05F7', email: 'bharathkurasa@gmail.com',   img: process.env.PUBLIC_URL + '/bharath.jpg' },
];

const Team = () => (
  <div className="container py-5">
    <h2
      className="text-center fw-bold mb-5 display-6"
      style={{ color: '#2c3e50', textShadow: '0 1px 2px rgba(255,255,255,.3)' }}
    >
      ✨ Our Creative Team ✨
    </h2>

    <div className="row justify-content-center g-4">
      {teamData.map((m, i) => (
        <div key={i} className="col-12 col-sm-6 col-md-4 col-lg-3 d-flex align-items-stretch">
          <div
            className="glass-card shadow-lg w-100 p-3 rounded-4 border"
            style={{
              backdropFilter: 'blur(10px)',
              background: 'rgba(255,255,255,.7)',
              border: '1px solid rgba(0,0,0,.1)',
              transition: 'transform .3s, box-shadow .3s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'scale(1.03)';
              e.currentTarget.style.boxShadow = '0 12px 20px rgba(0,0,0,.2)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,.1)';
            }}
          >
            {/* Full‑width responsive image */}
            <img
              src={m.img}
              alt={m.name}
              className="img-fluid w-100 rounded-4 mb-3"
              style={{ height: '200px', objectFit: 'cover', borderBottomLeftRadius: '0', borderBottomRightRadius: '0' }}
            />

            <div className="text-center">
              <h5 className="fw-bold text-dark mb-1">{m.name}</h5>
              <span className="badge bg-info mb-2">{m.branch}</span>
              <p className="text-dark mb-2">
                <FaIdBadge className="me-1 text-secondary" />
                {m.roll}
              </p>
              <p className="text-dark mb-0">
                <FaEnvelope className="me-1 text-secondary" />
                <a href={`mailto:${m.email}`} className="text-dark text-decoration-none">
                  {m.email}
                </a>
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default Team;
