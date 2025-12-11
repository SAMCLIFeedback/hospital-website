import DropdownPortal from '@components/DropdownPortal.jsx';

const DepartmentConcerned = ({
  styles,
  dropdownRef,
  inputRef,
  searchTerm,
  setSearchTerm,
  setShowDropdown,
  setDropdownCoords,
  formData,
  showDropdown,
  dropdownCoords,
  handleDepartmentSelect,
  handleInputChange,
  departments
}) => {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionLabel}>
          <span className={styles.stepNumber}>3</span>
          Which department is this about?
          <span className={styles.required}>*</span>
        </h2>
        <p className={styles.sectionDescription}>
          Select the department or service your feedback relates to.
        </p>
      </div>

      <div className={styles.dropdownContainer} ref={dropdownRef}>
        <div className={styles.searchInputContainer}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => {
              const rect = inputRef.current.getBoundingClientRect();
              setDropdownCoords({
                top: rect.bottom + window.scrollY,
                left: rect.left,
                width: rect.width,
              });
              setShowDropdown(true);
            }}
            placeholder="Search departments or select from list..."
            className={styles.searchInput}
            required={formData.department !== 'custom'}
            aria-controls="department-dropdown"
            aria-autocomplete="list"
          />
        </div>

        {showDropdown && (
          <DropdownPortal>
            <div
              className={styles.dropdown}
              style={{
                position: 'absolute',
                top: dropdownCoords.top,
                left: dropdownCoords.left,
                width: dropdownCoords.width,
                zIndex: 9999
              }}
              ref={dropdownRef}
              id="department-dropdown"
              role="listbox"
            >
              <div
                className={styles.dropdownOption}
                onClick={() => handleDepartmentSelect('General Feedback')}
                role="option"
                aria-selected={formData.department === 'General Feedback'}
              >
                <span className={styles.optionIcon}>🏥</span>
                <div className={styles.optionContent}>
                  <strong>General Feedback</strong>
                  <small>General facility or multi-department feedback</small>
                </div>
              </div>

              {Object.entries(departments).map(([category, depts]) => {
                const filteredDepts = depts.filter(dept =>
                  dept.toLowerCase().includes(searchTerm.toLowerCase())
                );

                return filteredDepts.length > 0 && (
                  <div key={category} className={styles.categoryGroup}>
                    <div className={styles.categoryHeader}>
                      <span className={styles.categoryIcon}>📋</span>
                      {category}
                    </div>
                    {filteredDepts.map(dept => (
                      <div
                        key={dept}
                        className={styles.dropdownOption}
                        onClick={() => handleDepartmentSelect(dept)}
                        role="option"
                        aria-selected={formData.department === dept}
                      >
                        <span className={styles.optionIcon}>•</span>
                        <div className={styles.optionContent}>{dept}</div>
                      </div>
                    ))}
                  </div>
                );
              })}

              <div
                className={`${styles.dropdownOption} ${styles.customOption}`}
                onClick={() => {
                  handleInputChange('department', 'custom');
                  handleInputChange('customDepartment', '');
                  setSearchTerm('');
                  setShowDropdown(false);
                }}
                role="option"
                aria-selected={formData.department === 'custom'}
              >
                <span className={styles.optionIcon}>✏️</span>
                <div className={styles.optionContent}>
                  <strong>My department isn't listed</strong>
                  <small>Specify a custom department or unit</small>
                </div>
              </div>
            </div>
          </DropdownPortal>
        )}
      </div>

      {formData.department === 'custom' && (
        <div className={styles.conditionalField}>
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Department/Unit Name:</label>
            <input
              type="text"
              value={formData.customDepartment}
              onChange={(e) => handleInputChange('customDepartment', e.target.value)}
              placeholder="Please specify your unit or department..."
              className={styles.textInput}
              required
              aria-required="true"
            />
          </div>
        </div>
      )}
    </section>
  )
}

export default DepartmentConcerned