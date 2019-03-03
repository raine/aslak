import React, { useState } from 'react'
import classNames from 'classnames'

import '../css/Dropdown.scss'

const Dropdown = React.memo(({ options, value, setValue }) => {
  const [open, setOpen] = useState(false)
  const toggle = () => setOpen(!open)
  return (
    <ul className={classNames('dropdown', { open })} onClick={toggle}>
      {options.map(({ key, text }) => (
        <li
          className={classNames({ selected: value === key })}
          key={key}
          onClick={() => {
            toggle()
            setValue(key)
          }}
        >
          {text}

          <svg
            className="chevron"
            viewBox="5.118 8.113 13.725 8.746"
            width="10"
            height="9"
            fill="none"
            stroke="#404040"
            strokeWidth="2.4"
            strokeLinecap="butt"
            strokeLinejoin="arcs"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </li>
      ))}
    </ul>
  )
})

Dropdown.displayName = 'Dropdown'

export default Dropdown
