import os

def rename_files_in_directory():
    # Get the current working directory
    directory = os.getcwd()
    
    # Loop through all items in the directory
    for filename in os.listdir(directory):
        old_file = os.path.join(directory, filename)
        
        # Only process files (not directories)
        if os.path.isfile(old_file):
            # Check if the file name contains spaces
            if ' ' in filename:
                # Construct the new file name by replacing spaces with underscores
                new_filename = filename.replace(' ', '_')
                
                new_file = os.path.join(directory, new_filename)
                
                try:
                    # Rename the file
                    os.rename(old_file, new_file)
                    print(f'Renamed: {filename} -> {new_filename}')
                except Exception as e:
                    print(f'Error renaming {filename}: {e}')
        else:
            print(f'Skipped directory: {filename}')

# Call the function to rename files in the current directory
rename_files_in_directory()
